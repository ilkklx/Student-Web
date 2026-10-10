package com.sms.studentms_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentDTO {
    private Long id;
    private Long studentId;
    private Long courseId;
    private String grade;
    private String courseCode;   // for display
    private String courseTitle;  // for display
    private Integer credits;
    private boolean withdrawn;
}
