package com.sms.studentms_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    private long totalStudents;
    private long totalCourses;
    private long totalEnrollments;
    private Double averageAge;  // can be null if no birth dates
    private Map<String, Long> studentsPerDepartment;
}