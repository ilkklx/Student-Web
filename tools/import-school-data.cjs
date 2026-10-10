const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const api = 'http://127.0.0.1:8088/api';
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
      return response.status === 204 ? null : response.json();
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
    const byCode = new Map(existingCourses.map(c => [c.code, c]));
    // 在写入前核对所有现有匹配项，避免覆盖用户手动修改过的数据。
    for (const s of source.students) {
      const existing = byEmail.get(s.studentNumber + '@lingnan');
      if (existing) assert(existing.name === s.name && existing.department === s.department, '已有记录与源名单不一致：' + s.studentNumber);
    }
    const backupFile = path.join(runtime, 'school-import-before.json');
    if (!fs.existsSync(backupFile)) fs.writeFileSync(backupFile, JSON.stringify({ students: existingStudents, deletedStudents, courses: existingCourses }, null, 2), 'utf8');
    checkpoint();
    let createdThisRun = 0;
    for (const s of source.students) {
      const email = s.studentNumber + '@lingnan';
      if (byEmail.has(email)) { report.skippedStudents += 1; continue; }
      const created = await request('/students', 'POST', { name: s.name, email, department: s.department });
      byEmail.set(email, created);
      report.createdStudentIds.push(created.id);
      createdThisRun += 1;
      checkpoint();
      if (createdThisRun % 100 === 0) console.log('已添加 ' + createdThisRun + ' 名学生...');
    }
    for (const c of source.courses) {
      if (byCode.has(c.code)) { report.skippedCourses += 1; continue; }
      const created = await request('/courses', 'POST', { code: c.code, title: c.title, credits: null });
      report.createdCourseIds.push(created.id);
      checkpoint();
    }

    const active = await allStudents();
    const activeByEmail = new Map(active.map(s => [s.email, s]));
    let activeImportedStudents = 0;
    for (const s of source.students) {
      const actual = activeByEmail.get(s.studentNumber + '@lingnan');
      if (actual) {
        assert(actual.name === s.name && actual.department === s.department, '导入后数据核验失败：' + s.studentNumber);
        activeImportedStudents += 1;
      }
    }
    const courses = await request('/courses');
    for (const c of source.courses) assert(courses.some(x => x.code === c.code && x.title === c.title && x.credits === null), '课程核验失败：' + c.code);
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
    console.log('课程学分与个人成绩留空；未自动创建个人选课记录。');
  } catch (e) {
    report.status = 'FAIL';
    report.error = e.message;
    checkpoint();
    console.error(e.message);
    process.exitCode = 1;
  }
})();
