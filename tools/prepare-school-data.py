from pathlib import Path
from collections import Counter
import hashlib
import json
import re
import argparse
import openpyxl
import xlrd

parser = argparse.ArgumentParser(description='核对名单与课表后生成导入数据；输入缺失时不写文件。')
parser.add_argument('output', type=Path)
parser.add_argument('--schedule', type=Path, default=Path('F:/WX/xwechat_files/班级文件/大一/2026春季课表/班级课表(2025)'))
parser.add_argument('--rosters', type=Path, default=Path('F:/WX/xwechat_files/班级文件/绩点/2026 综测/23-25级综测结果公示表（最终版）/2025级'))
parser.add_argument('--catalog', type=Path, default=Path(__file__).resolve().parents[1] / 'studentms-frontend/public/school-catalog.json')
args = parser.parse_args()
schedule, rosters, out = args.schedule, args.rosters, args.output

def require(condition, message):
    if not condition:
        raise ValueError(message)

require(schedule.is_dir(), f'课表目录不存在：{schedule}')
require(rosters.is_dir(), f'学生名单目录不存在：{rosters}')
roster_files = sorted(p for p in rosters.glob('*.xlsx') if not p.name.startswith('~$'))
schedule_files = sorted(p for p in schedule.glob('*.xls') if not p.name.startswith('~$'))
require(roster_files, f'学生名单目录中没有 xlsx 文件：{rosters}')
require(schedule_files, f'课表目录中没有 xls 文件：{schedule}')

def normalize(value):
    value = re.sub(r'\s+', '', str(value))
    value = value.replace('级', '').replace('计算机科学与技术', '计科').replace('数据科学与大数据技术', '大数据')
    return value

students = []
for p in roster_files:
    before = len(students)
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    for s in wb:
        for rownum, row in enumerate(s.iter_rows(min_row=5, values_only=True), 5):
            require(len(row) > 7, f'名单列数不足：{p.name} 第 {rownum} 行，至少需要 8 列')
            number = str(row[2]).strip() if row[2] is not None else ''
            if isinstance(row[2], (float, int)):
                require(not isinstance(row[2], float) or row[2].is_integer(), f'学号不能含小数：{p.name} 第 {rownum} 行')
                number = str(int(row[2]))
            if not re.fullmatch(r'\d{12}', number):
                continue
            require(row[3] and row[5] and row[7], f'名单字段缺失：{p.name} 第 {rownum} 行')
            require(2 <= len(str(row[3]).strip()) <= 100 and 0 < len(str(row[5]).strip()) <= 255 and 0 < len(str(row[7]).strip()) <= 255,
                    f'名单字段长度不合法：{p.name} 第 {rownum} 行')
            students.append({'studentNumber': number, 'name': str(row[3]).strip(), 'department': str(row[7]).strip(), 'major': str(row[5]).strip(), 'classKey': normalize(row[7]), 'source': p.name, 'sourceRow': rownum})
    wb.close()
    require(len(students) > before, f'未识别到有效学生，核对名单列格式：{p.name}')

classes = {}
for p in schedule_files:
    key = normalize(p.name.split('课表')[0])
    require(key not in classes, f'存在重复班级课表：{p.name}')
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
    require(courses, f'未识别到有效课程，核对课表格式：{p.name}')
    classes[key] = {'source': p.name, 'courses': sorted(courses)}

numbers = [s['studentNumber'] for s in students]
require(students, '未识别到有效学生，停止导入')
require(len(numbers) == len(set(numbers)), 'Duplicate student numbers')
matched = [s for s in students if s['classKey'] in classes]
unmatched = [s for s in students if s['classKey'] not in classes]
course_titles = sorted({c for v in classes.values() for c in v['courses']})
courses = [{'code': 'SPR26-' + hashlib.sha256(c.encode('utf-8')).hexdigest()[:10].upper(), 'title': c} for c in course_titles]
counts = dict(Counter(s['department'] for s in matched))
require(courses, '未识别到有效课程，停止导入')
require(all(0 < len(c['title']) <= 255 for c in courses), '课程名称长度不合法')
require(len({c['code'] for c in courses}) == len(courses), '课程编号冲突')
require(not unmatched, '存在未匹配课表的学生，请人工核对')

# 课程浏览目录只包含专业、班级和课程关系，不公开学生个人名单。
catalog = []
for major in sorted({s['major'] for s in matched}):
    groups = []
    for key in sorted({s['classKey'] for s in matched if s['major'] == major}):
        class_students = [s for s in matched if s['classKey'] == key]
        require(len({s['major'] for s in class_students}) == 1, f'同一班级包含多个专业：{key}')
        require(len({s['department'] for s in class_students}) == 1, f'同一班级包含不同班级名：{key}')
        groups.append({
            'name': class_students[0]['department'],
            'studentCount': len(class_students),
            'courseCodes': ['SPR26-' + hashlib.sha256(c.encode('utf-8')).hexdigest()[:10].upper() for c in classes[key]['courses']],
        })
    catalog.append({'name': re.sub(r'^\d{4}级', '', major), 'classes': groups})
require(catalog, '课程目录为空，停止导入')
# 所有来源和关联核验完成后才写输出，避免失败时覆盖已有目录。
payload = {'students': matched, 'unmatchedStudents': unmatched, 'classes': classes, 'courses': courses, 'classCounts': counts, 'catalog': catalog}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'核对完成：{len(classes)} 个班级，{len(matched)} 名学生，{len(courses)} 门课程。')
catalog_path = args.catalog
catalog_path.parent.mkdir(parents=True, exist_ok=True)
catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'课程目录已更新：{len(catalog)} 个专业，{sum(len(m["classes"]) for m in catalog)} 个班级。')
