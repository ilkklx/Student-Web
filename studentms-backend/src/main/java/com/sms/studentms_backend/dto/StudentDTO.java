package com.sms.studentms_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentDTO {
    private Long id;

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    private String department;

    private String photoUrl;

    private String accountUsername;

    @jakarta.validation.constraints.Pattern(regexp = "[0-9]{6,32}", message = "Student number must contain 6 to 32 digits")
    private String studentNumber;

    public StudentDTO(Long id, String name, String email, String department, String photoUrl) {
        this(id, name, email, department, photoUrl, null, null);
    }
}
