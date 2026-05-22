package com.sms.studentms_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StudentRegistrationRequest {

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    @NotBlank
    private String roleName = "ROLE_STUDENT";

    @NotBlank
    private String name;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String department;
}