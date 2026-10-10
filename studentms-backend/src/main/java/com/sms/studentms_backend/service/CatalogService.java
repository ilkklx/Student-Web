package com.sms.studentms_backend.service;

import com.sms.studentms_backend.dto.SchoolClassRequest;
import com.sms.studentms_backend.entity.*;
import com.sms.studentms_backend.repository.*;
import com.sms.studentms_backend.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class CatalogService {
    private final SchoolClassRepository classes;
    private final CourseRepository courses;
    private final StudentRepository students;
    private final MajorRepository majors;

    public CatalogService(SchoolClassRepository classes, CourseRepository courses, StudentRepository students, MajorRepository majors) {
        this.classes = classes; this.courses = courses; this.students = students;
        this.majors = majors;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCatalog() {
        Map<String, List<Map<String, Object>>> grouped = new TreeMap<>();
        for (SchoolClass c : classes.findAll(org.springframework.data.domain.Sort.by("name"))) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", c.getId());
            row.put("name", c.getName());
            row.put("studentCount", students.countBySchoolClassIdAndDeletedFalse(c.getId()));
            row.put("courseCodes", c.getCourses().stream().map(Course::getCode).sorted().toList());
            grouped.computeIfAbsent(c.getMajor().getName(), ignored -> new ArrayList<>()).add(row);
        }
        return grouped.entrySet().stream().map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", e.getKey()); row.put("classes", e.getValue()); return row;
        }).toList();
    }

    @Transactional
    public void saveClass(SchoolClassRequest request) {
        SchoolClass schoolClass = classes.findByName(request.name().trim()).orElseGet(SchoolClass::new);
        schoolClass.setName(request.name().trim());
        Major major = majors.findByName(request.major().trim()).orElseGet(() -> {
            Major created = new Major(); created.setName(request.major().trim()); return majors.save(created);
        });
        schoolClass.setMajor(major);
        Set<Course> assigned = new HashSet<>();
        for (String code : request.courseCodes()) {
            assigned.add(courses.findByCode(code).orElseThrow(() ->
                    new BusinessException(HttpStatus.BAD_REQUEST, "Course code not found: " + code)));
        }
        schoolClass.setCourses(assigned);
        classes.saveAndFlush(schoolClass);
        migrateLegacyStudents();
    }

    @Transactional
    public void migrateLegacyStudents() {
        Map<String, SchoolClass> byName = new HashMap<>();
        classes.findAll().forEach(c -> byName.put(c.getName(), c));
        for (Student s : students.findAll()) {
            if (s.getSchoolClass() == null && byName.containsKey(s.getDepartment())) {
                s.setSchoolClass(byName.get(s.getDepartment()));
            }
            if (s.getStudentNumber() == null && s.getEmail().matches("[0-9]{12}@lingnan")) {
                s.setStudentNumber(s.getEmail().substring(0, 12));
            }
        }
    }

}
