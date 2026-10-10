const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');

const importer = path.resolve(__dirname, '../import-school-data.cjs');
function fixture(changes = {}) {
  const directory = fs.mkdtempSync(path.join(process.env.STUDENT_WEB_TEST_TMP || os.tmpdir(), 'student-web-import-'));
  const source = {
    students: [{ studentNumber: '202500000001', name: 'Source Student', department: 'Source Class' }],
    courses: [{ code: 'SPR26-TEST', title: 'Source Course' }], unmatchedStudents: [],
    catalog: [{ name: 'Source Major', classes: [{ name: 'Source Class', courseCodes: ['SPR26-TEST'] }] }],
    ...changes,
  };
  const manifest = path.join(directory, 'source.json');
  fs.writeFileSync(manifest, JSON.stringify(source));
  return { directory, manifest };
}

async function run(fixture, api) {
  const child = spawn(process.execPath, [importer, fixture.manifest], {
    env: { ...process.env, STUDENT_WEB_API_URL: api }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const exit = await new Promise((resolve, reject) => {
    child.on('error', reject); child.on('close', resolve);
  });
  return { exit, output };
}

async function mockApi(handler, callback) {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const item = { method: request.method, url: request.url, body: raw ? JSON.parse(raw) : null };
    requests.push(item);
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(handler(item)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await callback('http://127.0.0.1:' + server.address().port + '/api', requests); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('empty input fails before login and preserves an existing report', async () => {
  const files = fixture({ students: [], courses: [] });
  const report = path.join(files.directory, 'school-import-report.json');
  fs.writeFileSync(report, '{"status":"PREVIOUS"}');
  await mockApi(() => ({}), async (api, requests) => {
    const result = await run(files, api);
    assert.equal(result.exit, 1);
    assert.match(result.output, /学生名单为空/);
    assert.deepEqual(requests, []);
    assert.equal(fs.readFileSync(report, 'utf8'), '{"status":"PREVIOUS"}');
    assert(!fs.existsSync(path.join(files.directory, 'school-import-before.json')));
  });
});

test('an unknown catalog course fails before login or output writes', async () => {
  const files = fixture({ catalog: [{ name: 'Major', classes: [{ name: 'Source Class', courseCodes: ['MISSING'] }] }] });
  await mockApi(() => ({}), async (api, requests) => {
    const result = await run(files, api);
    assert.equal(result.exit, 1);
    assert.match(result.output, /不存在的课程/);
    assert.deepEqual(requests, []);
    assert.deepEqual(fs.readdirSync(files.directory), ['source.json']);
  });
});

test('numeric identifiers and whitespace aliases fail before login and preserve reports', async t => {
  const student = { studentNumber: '202500000001', name: 'Source Student', department: 'Source Class' };
  const course = { code: 'SPR26-TEST', title: 'Source Course' };
  for (const [name, changes] of [
    ['numeric student number', { students: [{ ...student, studentNumber: 202500000001 }] }],
    ['student name whitespace', { students: [{ ...student, name: ' Source Student' }] }],
    ['department whitespace', { students: [{ ...student, department: 'Source Class ' }] }],
    ['course code whitespace', { courses: [{ ...course, code: ' SPR26-TEST ' }] }],
    ['course title whitespace', { courses: [{ ...course, title: 'Source Course ' }] }],
  ]) {
    await t.test(name, async () => {
      const files = fixture(changes);
      const report = path.join(files.directory, 'school-import-report.json');
      fs.writeFileSync(report, '{"status":"PREVIOUS"}');
      await mockApi(() => ({}), async (api, requests) => {
        const result = await run(files, api);
        assert.equal(result.exit, 1);
        assert.match(result.output, /字段不合法/);
        assert.deepEqual(requests, []);
        assert.equal(fs.readFileSync(report, 'utf8'), '{"status":"PREVIOUS"}');
        assert(!fs.existsSync(path.join(files.directory, 'school-import-before.json')));
      });
    });
  }
});

test('a legacy email with a conflicting nonempty student number fails before mutations', async () => {
  const files = fixture();
  await mockApi(request => {
    if (request.url === '/api/auth/login') return { token: 'mock-token' };
    if (request.url.startsWith('/api/students?')) return { content: [{ id: 7, studentNumber: '202500000099', email: '202500000001@lingnan', name: 'Another Student', department: 'Class' }], totalPages: 1 };
    if (request.url === '/api/students/deleted') return [];
    if (request.url === '/api/courses') return [];
    return [];
  }, async (api, requests) => {
    const result = await run(files, api);
    assert.equal(result.exit, 1);
    assert.match(result.output, /学生身份冲突/);
    assert(requests.every(request => request.method === 'GET' || request.url === '/api/auth/login'));
    assert.deepEqual(fs.readdirSync(files.directory), ['source.json']);
  });
});

test('a legacy uppercase email identifies the existing student without creating a duplicate', async () => {
  const files = fixture();
  const student = { id: 7, studentNumber: null, email: '202500000001@LINGNAN', name: 'Source Student', department: 'Source Class' };
  const courses = [{ id: 8, code: 'SPR26-TEST', title: 'Source Course', credits: null }];
  await mockApi(request => {
    if (request.url === '/api/auth/login') return { token: 'mock-token' };
    if (request.url.startsWith('/api/students?')) return { content: [student], totalPages: 1 };
    if (request.url === '/api/students/deleted') return [];
    if (request.url === '/api/courses') return courses;
    if (request.url === '/api/catalog') return [];
    if (request.url === '/api/catalog/classes') return null;
    if (request.url === '/api/dashboard/stats') return { totalStudents: 1, totalCourses: 1 };
    throw new Error('Unexpected request: ' + request.url);
  }, async (api, requests) => {
    const result = await run(files, api);
    assert.equal(result.exit, 0, result.output);
    assert(!requests.some(request => request.method === 'POST' && request.url !== '/api/auth/login'));
    const report = JSON.parse(fs.readFileSync(path.join(files.directory, 'school-import-report.json')));
    assert.equal(report.skippedStudents, 1);
    assert.equal(report.activeImportedStudents, 1);
    const snapshot = JSON.parse(fs.readFileSync(path.join(files.directory, 'school-import-before.json')));
    assert.equal(snapshot.students[0].email, '202500000001@LINGNAN');
    assert.equal(snapshot.students[0].studentNumber, null);
  });
});

test('reimport preserves student edits, existing courses, major and extra class courses', async () => {
  const files = fixture();
  fs.writeFileSync(path.join(files.directory, 'school-import-report.json'), JSON.stringify({ status: 'FAIL', error: 'Previous failure' }));
  const student = { id: 7, studentNumber: '202500000001', email: 'edited@example.com', name: 'Edited Student', department: 'Edited Class' };
  const courses = [{ id: 8, code: 'SPR26-TEST', title: 'Edited Course', credits: 5 }, { id: 9, code: 'MANUAL', title: 'Manual Course', credits: 2 }];
  await mockApi(request => {
    if (request.url === '/api/auth/login') return { token: 'mock-token' };
    if (request.url.startsWith('/api/students?')) return { content: [student], totalPages: 1 };
    if (request.url === '/api/students/deleted') return [];
    if (request.url === '/api/courses') return courses;
    if (request.url === '/api/catalog') return [{ name: 'Edited Major', classes: [{ name: 'Source Class', courseCodes: ['MANUAL'] }] }];
    if (request.url === '/api/catalog/classes') return null;
    if (request.url === '/api/dashboard/stats') return { totalStudents: 1, totalCourses: 2 };
    throw new Error('Unexpected request: ' + request.url);
  }, async (api, requests) => {
    const result = await run(files, api);
    assert.equal(result.exit, 0, result.output);
    assert(!requests.some(request => request.method === 'POST' && request.url !== '/api/auth/login'));
    const assignment = requests.find(request => request.url === '/api/catalog/classes');
    assert.equal(assignment.body.major, 'Edited Major');
    assert.deepEqual(new Set(assignment.body.courseCodes), new Set(['MANUAL', 'SPR26-TEST']));
    const report = JSON.parse(fs.readFileSync(path.join(files.directory, 'school-import-report.json')));
    assert.equal(report.status, 'PASS');
    assert.equal(report.error, undefined);
    assert.equal(report.skippedStudents, 1);
    assert.deepEqual(report.existingStudentDifferences, [{ studentId: 7, fields: ['name', 'department'] }]);
  });
});
