package com.sms.studentms_backend.service;

import com.sms.studentms_backend.dto.DashboardStatsDTO;
import com.sms.studentms_backend.repository.CourseRepository;
import com.sms.studentms_backend.repository.EnrollmentRepository;
import com.sms.studentms_backend.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    public DashboardStatsDTO getDashboardStats() {
        long totalStudents = 0;
        long totalCourses = 0;
        long totalEnrollments = 0;
        Double averageAge = null;
        Map<String, Long> studentsPerDepartment = new HashMap<>();

        try {
            totalStudents = studentRepository.countTotalStudents();
        } catch (Exception e) { /* log */ }

        try {
            totalCourses = courseRepository.countTotalCourses();
        } catch (Exception e) { /* log */ }

        try {
            totalEnrollments = enrollmentRepository.countTotalEnrollments();
        } catch (Exception e) { /* log */ }

        try {
            averageAge = studentRepository.getAverageAge();
        } catch (Exception e) { /* log */ }

        try {
            List<Object[]> deptData = studentRepository.countStudentsByDepartment();
            for (Object[] row : deptData) {
                if (row[0] != null && row[1] != null) {
                    studentsPerDepartment.put((String) row[0], ((Number) row[1]).longValue());
                }
            }
        } catch (Exception e) { /* log */ }

        return new DashboardStatsDTO(totalStudents, totalCourses, totalEnrollments, averageAge, studentsPerDepartment);
    }
}