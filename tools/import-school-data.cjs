const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const api = process.env.STUDENT_WEB_API_URL || 'http://127.0.0.1:8088/api';
const manifestFile = process.argv[2];
const runtime = path.dirname(manifestFile);
const source = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const reportFile = path.join(runtime, 'school-import-report.json');
const previous = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
const report = { ...previous, startedAt: new Date().toISOString(), status: 'RUNNING', createdStudentIds: previous.createdStudentIds || [], createdCourseIds: previous.createdCourseIds || [], skippedStudents: 0, skippedCourses: 0 };
const checkpoint = () => fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');

(async () => {
  try {
    assert.equal(source.unmatchedStudents.length, 0, '存在未匹配课表的班级');
    assert.equal(new Set(source.students.map(s => s.studentNumber)).size, source.students.length);
    for (const s of source.students) {
      assert(/^\d{12}$/.test(s.studentNumber) && s.name.length >= 2 && s.name.length <= 100 && s.department, '名单字段不合法');
    }
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
    const byEmail = new Map([...existingStudents, ...deletedStudents].map(s => [s.email, s]));
    const byNumber = new Map([...existingStudents, ...deletedStudents].filter(s => s.studentNumber).map(s => [String(s.studentNumber), s]));
    const existingFor = s => byNumber.get(String(s.studentNumber)) || byEmail.get(s.studentNumber + '@lingnan');
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
    const backupFile = path.join(runtime, 'school-import-before.json');
    if (!fs.existsSync(backupFile)) fs.writeFileSync(backupFile, JSON.stringify({ students: existingStudents, deletedStudents, courses: existingCourses }, null, 2), 'utf8');
    checkpoint();
    let createdThisRun = 0;
    const newStudentIds = new Set();
    const newCourseIds = new Set();
    for (const s of source.students) {
      const email = s.studentNumber + '@lingnan';
      if (existingFor(s)) { report.skippedStudents += 1; continue; }
      const created = await request('/students', 'POST', { name: s.name, email, department: s.department, studentNumber: s.studentNumber });
      byEmail.set(email, created);
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

    const catalog = JSON.parse(fs.readFileSync(process.argv[3] || path.join(__dirname, '../studentms-frontend/public/school-catalog.json'), 'utf8'));
    const currentCatalog = await request('/catalog');
    const currentClasses = new Map(currentCatalog.flatMap(major => major.classes.map(c => [c.name, { ...c, major: major.name }])));
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
    const activeByEmail = new Map(active.map(s => [s.email, s]));
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
    checkpoint();
    console.error(e.message);
    process.exitCode = 1;
  }
})();
