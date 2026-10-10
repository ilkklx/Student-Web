package com.sms.studentms_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseDTO {
    private Long id;
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(max = 255)
    private String code;
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(max = 255)
    private String title;
    @jakarta.validation.constraints.Positive
    private Integer credits;

    private String teacherUsername;

    public CourseDTO(Long id, String code, String title, Integer credits) {
        this(id, code, title, credits, null);
    }
}
