package com.sms.studentms_backend.service;

import com.sms.studentms_backend.dto.DashboardStatsDTO;
import com.sms.studentms_backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.Map;

@Service
public class DashboardService {
    private final StudentRepository students;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;

    public DashboardService(StudentRepository students, CourseRepository courses, EnrollmentRepository enrollments) {
        this.students = students; this.courses = courses; this.enrollments = enrollments;
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getDashboardStats() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : students.countStudentsByDepartment()) {
            if (row[0] != null) counts.put((String) row[0], ((Number) row[1]).longValue());
        }
        return new DashboardStatsDTO(students.countTotalStudents(), courses.countTotalCourses(),
                enrollments.countTotalEnrollments(), null, counts);
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getTeacherStats(String username) {
        long roster = students.searchActive("", "", username, org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements();
        long courseCount = courses.findAll().stream().filter(c -> c.getTeacher() != null && c.getTeacher().getUsername().equals(username)).count();
        return new DashboardStatsDTO(roster, courseCount, enrollments.countTeacherEnrollments(username), null, Map.of());
    }
}
