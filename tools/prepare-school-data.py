from pathlib import Path
from collections import Counter
import hashlib
import sys
import json
import re
import openpyxl
import xlrd

schedule = Path('F:/WX/xwechat_files/班级文件/大一/2026春季课表/班级课表(2025)')
rosters = Path('F:/WX/xwechat_files/班级文件/绩点/2026 综测/23-25级综测结果公示表（最终版）/2025级')
out = Path(sys.argv[1])

def normalize(value):
    value = re.sub(r'\s+', '', str(value))
    value = value.replace('级', '').replace('计算机科学与技术', '计科').replace('数据科学与大数据技术', '大数据')
    return value

students = []
for p in sorted(rosters.glob('*.xlsx')):
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    for s in wb:
        for rownum, row in enumerate(s.iter_rows(min_row=5, values_only=True), 5):
            number = str(row[2]).strip() if row[2] is not None else ''
            if isinstance(row[2], (float, int)):
                number = str(int(row[2]))
            if not re.fullmatch(r'\d{12}', number):
                continue
            assert row[3] and row[7], (p.name, rownum)
            students.append({'studentNumber': number, 'name': str(row[3]).strip(), 'department': str(row[7]).strip(), 'major': str(row[5]).strip(), 'classKey': normalize(row[7]), 'source': p.name, 'sourceRow': rownum})
    wb.close()

classes = {}
for p in sorted(schedule.glob('*.xls')):
    key = normalize(p.name.split('课表')[0])
    wb = xlrd.open_workbook(str(p))
    courses = set()
    for s in wb.sheets():
        for i in range(2, s.nrows):
            for j in range(s.ncols):
                cell = str(s.cell_value(i, j)).strip()
                if not cell or cell.startswith('注--'):
                    continue
                if cell.startswith(('实践课程：', '其他课程：')):
                    body = cell.split('：', 1)[1]
                    for part in body.split(';'):
                        title = re.split('[■★☆]', part)[0].strip()
                        if title:
                            courses.add(title)
                elif j >= 2:
                    for line in cell.splitlines():
                        title = line.split('/')[0].strip()
                        title = re.sub(r'\s*\(?板块\)?$', '', title).strip()
                        title = title.replace('(2023)', '').replace('(2025)', '').strip()
                        if title and ('/' in line or '板块' in line):
                            courses.add(title)
    classes[key] = {'source': p.name, 'courses': sorted(courses)}

numbers = [s['studentNumber'] for s in students]
assert len(numbers) == len(set(numbers)), 'Duplicate student numbers'
matched = [s for s in students if s['classKey'] in classes]
unmatched = [s for s in students if s['classKey'] not in classes]
course_titles = sorted({c for v in classes.values() for c in v['courses']})
courses = [{'code': 'SPR26-' + hashlib.sha256(c.encode('utf-8')).hexdigest()[:10].upper(), 'title': c} for c in course_titles]
counts = dict(Counter(s['department'] for s in matched))
assert len({c['code'] for c in courses}) == len(courses)
assert not unmatched, '存在未匹配课表的学生，请人工核对'
payload = {'students': matched, 'unmatchedStudents': unmatched, 'classes': classes, 'courses': courses, 'classCounts': counts}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'核对完成：{len(classes)} 个班级，{len(matched)} 名学生，{len(courses)} 门课程。')

# 课程浏览目录只包含专业、班级和课程关系，不公开学生个人名单。
catalog = []
for major in sorted({s['major'] for s in matched}):
    groups = []
    for key in sorted({s['classKey'] for s in matched if s['major'] == major}):
        class_students = [s for s in matched if s['classKey'] == key]
        assert len({s['major'] for s in class_students}) == 1
        assert len({s['department'] for s in class_students}) == 1
        groups.append({
            'name': class_students[0]['department'],
            'studentCount': len(class_students),
            'courseCodes': ['SPR26-' + hashlib.sha256(c.encode('utf-8')).hexdigest()[:10].upper() for c in classes[key]['courses']],
        })
    catalog.append({'name': re.sub(r'^\d{4}级', '', major), 'classes': groups})
catalog_path = Path(__file__).resolve().parents[1] / 'studentms-frontend/public/school-catalog.json'
catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
dist_catalog = catalog_path.parent.parent / 'dist/school-catalog.json'
if dist_catalog.parent.is_dir():
    dist_catalog.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'课程目录已更新：{len(catalog)} 个专业，{sum(len(m["classes"]) for m in catalog)} 个班级。')
