const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const api = process.env.STUDENT_WEB_API_URL || 'http://127.0.0.1:8088/api';
const manifestFile = process.argv[2];
const runtime = path.dirname(manifestFile);
const source = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const reportFile = path.join(runtime, 'school-import-report.json');
const previous = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
const report = { ...previous, startedAt: new Date().toISOString(), completedAt: undefined, error: undefined, status: 'RUNNING', createdStudentIds: previous.createdStudentIds || [], createdCourseIds: previous.createdCourseIds || [], skippedStudents: 0, skippedCourses: 0 };
const checkpoint = () => fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
let writesStarted = false;
const canonicalText = value => typeof value === 'string' && value.length > 0 && value === value.trim();

(async () => {
  try {
    assert(Array.isArray(source.students) && source.students.length > 0, '学生名单为空，未开始导入');
    assert(Array.isArray(source.courses) && source.courses.length > 0, '课程列表为空，未开始导入');
    assert(Array.isArray(source.unmatchedStudents), '名单缺少班级匹配核验结果');
    assert.equal(source.unmatchedStudents.length, 0, '存在未匹配课表的班级');
    for (const s of source.students) {
      assert(typeof s.studentNumber === 'string' && /^\d{12}$/.test(s.studentNumber)
        && canonicalText(s.name) && s.name.length >= 2 && s.name.length <= 100
        && canonicalText(s.department) && s.department.length <= 255, '名单字段不合法，请使用规范字符串且不要带首尾空白');
    }
    assert.equal(new Set(source.students.map(s => s.studentNumber)).size, source.students.length);
    const sourceCourseCodes = new Set();
    for (const course of source.courses) {
      assert(canonicalText(course.code) && course.code.length <= 255 && canonicalText(course.title) && course.title.length <= 255, '课程字段不合法，请使用规范字符串且不要带首尾空白');
      assert(!sourceCourseCodes.has(course.code), '源数据课程编号重复：' + course.code);
      sourceCourseCodes.add(course.code);
    }
    // 源目录与课程引用必须在登录和任何写入前核验。
    const catalog = process.argv[3]
      ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))
      : source.catalog || JSON.parse(fs.readFileSync(path.join(runtime, 'school-catalog.json'), 'utf8'));
    assert(Array.isArray(catalog) && catalog.length > 0, '专业班级目录为空，未开始导入');
    const classNames = new Set();
    for (const major of catalog) {
      assert(canonicalText(major.name) && major.name.length <= 255 && Array.isArray(major.classes) && major.classes.length > 0, '专业目录不合法');
      for (const schoolClass of major.classes) {
        assert(canonicalText(schoolClass.name) && schoolClass.name.length <= 255 && Array.isArray(schoolClass.courseCodes), '班级目录不合法');
        assert(!classNames.has(schoolClass.name), '源目录班级重复：' + schoolClass.name);
        classNames.add(schoolClass.name);
        for (const code of schoolClass.courseCodes) assert(sourceCourseCodes.has(code), '班级引用源数据中不存在的课程：' + code);
      }
    }
    for (const student of source.students) assert(classNames.has(student.department), '学生班级缺少课程目录：' + student.department);
    const login = await fetch(api + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'demo_admin', password: 'Demo12345!' }) });
    assert.equal(login.status, 200, '网页登录失败');
    const { token } = await login.json();
    async function request(route, method = 'GET', body) {
      const response = await fetch(api + route, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (!response.ok) throw new Error(method + ' ' + route + ': HTTP ' + response.status + ' ' + await response.text());
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    async function allStudents() {
      const result = [];
      let page = 0;
      let batch;
      do {
        batch = await request('/students?page=' + page + '&size=100&sortBy=id');
        result.push(...batch.content);
        page += 1;
      } while (page < batch.totalPages);
      return result;
    }
    const existingStudents = await allStudents();
    const deletedStudents = await request('/students/deleted');
    const existingCourses = await request('/courses');
    const byEmail = new Map([...existingStudents, ...deletedStudents].map(s => [s.email.toLowerCase(), s]));
    const byNumber = new Map([...existingStudents, ...deletedStudents].filter(s => s.studentNumber).map(s => [String(s.studentNumber), s]));
    const existingFor = s => {
      const exact = byNumber.get(String(s.studentNumber));
      if (exact) return exact;
      const legacy = byEmail.get(s.studentNumber + '@lingnan');
      if (legacy?.studentNumber && String(legacy.studentNumber) !== String(s.studentNumber)) {
        throw new Error('学生身份冲突：邮箱 ' + s.studentNumber + '@lingnan 对应档案 ' + legacy.id
          + ' 已保存不同学号，未开始导入，请管理员核对');
      }
      return legacy;
    };
    const byCode = new Map(existingCourses.map(c => [c.code, c]));
    report.existingStudentDifferences = [];
    // 按学号匹配身份；记录资料差异，保留管理员已有修改。
    for (const s of source.students) {
      const existing = existingFor(s);
      if (existing) {
        const fields = ['name', 'department'].filter(field => existing[field] !== s[field]);
        if (fields.length) report.existingStudentDifferences.push({ studentId: existing.id, fields });
      }
    }
    const currentCatalog = await request('/catalog');
    const currentClasses = new Map(currentCatalog.flatMap(major => major.classes.map(c => [c.name, { ...c, major: major.name }])));
    const backupFile = path.join(runtime, 'school-import-before.json');
    writesStarted = true;
    if (!fs.existsSync(backupFile)) fs.writeFileSync(backupFile, JSON.stringify({ students: existingStudents, deletedStudents, courses: existingCourses }, null, 2), 'utf8');
    checkpoint();
    let createdThisRun = 0;
    const newStudentIds = new Set();
    const newCourseIds = new Set();
    for (const s of source.students) {
      const email = s.studentNumber + '@lingnan';
      if (existingFor(s)) { report.skippedStudents += 1; continue; }
      const created = await request('/students', 'POST', { name: s.name, email, department: s.department, studentNumber: s.studentNumber });
      byEmail.set(email.toLowerCase(), created);
      byNumber.set(String(s.studentNumber), created);
      newStudentIds.add(created.id);
      report.createdStudentIds.push(created.id);
      createdThisRun += 1;
      checkpoint();
      if (createdThisRun % 100 === 0) console.log('已添加 ' + createdThisRun + ' 名学生...');
    }
    for (const c of source.courses) {
      if (byCode.has(c.code)) { report.skippedCourses += 1; continue; }
      const created = await request('/courses', 'POST', { code: c.code, title: c.title, credits: null });
      newCourseIds.add(created.id);
      byCode.set(c.code, created);
      report.createdCourseIds.push(created.id);
      checkpoint();
    }

    for (const major of catalog) {
      for (const schoolClass of major.classes) {
        const existingClass = currentClasses.get(schoolClass.name);
        await request('/catalog/classes', 'PUT', {
          name: schoolClass.name,
          major: existingClass?.major || major.name,
          courseCodes: [...new Set([...(existingClass?.courseCodes || []), ...schoolClass.courseCodes])],
        });
      }
    }

    const active = await allStudents();
    const activeByEmail = new Map(active.map(s => [s.email.toLowerCase(), s]));
    const activeByNumber = new Map(active.filter(s => s.studentNumber).map(s => [String(s.studentNumber), s]));
    let activeImportedStudents = 0;
    for (const s of source.students) {
      const actual = activeByNumber.get(String(s.studentNumber)) || activeByEmail.get(s.studentNumber + '@lingnan');
      if (actual) {
        if (newStudentIds.has(actual.id)) assert(actual.name === s.name && actual.department === s.department, '导入后数据核验失败：' + s.studentNumber);
        activeImportedStudents += 1;
      }
    }
    const courses = await request('/courses');
    for (const c of source.courses) {
      const actual = courses.find(x => x.code === c.code);
      assert(actual, '课程缺失：' + c.code);
      if (newCourseIds.has(actual.id)) assert(actual.title === c.title && actual.credits === null, '新课程核验失败：' + c.code);
    }
    report.sourceStudents = source.students.length;
    report.activeImportedStudents = activeImportedStudents;
    report.sourceCourses = source.courses.length;
    report.classCounts = source.classCounts;
    report.dashboard = await request('/dashboard/stats');
    assert.equal(report.dashboard.totalStudents, active.length);
    assert.equal(report.dashboard.totalCourses, courses.length);
    report.status = 'PASS';
    report.completedAt = new Date().toISOString();
    checkpoint();
    console.log('PASS：源名单 ' + source.students.length + ' 人，当前有效导入学生 ' + activeImportedStudents + ' 人；课程 ' + source.courses.length + ' 门。');
    console.log('本轮新增 ' + createdThisRun + ' 人，跳过已有 ' + report.skippedStudents + ' 人。');
    console.log('新导入课程的学分留空，已有课程与成绩保持原值；未自动创建个人选课记录。');
    if (report.existingStudentDifferences.length) console.log('已有 ' + report.existingStudentDifferences.length + ' 条学生资料与源名单不同，已保留手动修改并记入报告。');
  } catch (e) {
    report.status = 'FAIL';
    report.error = e.message;
    if (writesStarted) checkpoint();
    console.error(e.message);
    process.exitCode = 1;
  }
})();
