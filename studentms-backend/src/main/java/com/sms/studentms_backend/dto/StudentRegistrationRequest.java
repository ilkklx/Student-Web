package com.sms.studentms_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StudentRegistrationRequest {

    @NotBlank
    @jakarta.validation.constraints.Size(min = 3, max = 100)
    private String username;

    @NotBlank
    @jakarta.validation.constraints.Size(min = 8, max = 72)
    private String password;

    @NotBlank
    private String roleName = "ROLE_STUDENT";

    @NotBlank
    @jakarta.validation.constraints.Size(min = 2, max = 100)
    private String name;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String department;
}
