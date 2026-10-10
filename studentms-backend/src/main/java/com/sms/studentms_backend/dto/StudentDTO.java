package com.sms.studentms_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
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

    @com.fasterxml.jackson.annotation.JsonIgnore
    @lombok.Getter(lombok.AccessLevel.NONE)
    @lombok.Setter(lombok.AccessLevel.NONE)
    private boolean studentNumberPresent;

    @com.fasterxml.jackson.annotation.JsonSetter("studentNumber")
    public void setStudentNumber(String studentNumber) {
        this.studentNumber = studentNumber;
        this.studentNumberPresent = true;
    }

    public boolean hasStudentNumber() { return studentNumberPresent; }

    public StudentDTO(Long id, String name, String email, String department, String photoUrl) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.department = department;
        this.photoUrl = photoUrl;
    }

    public StudentDTO(Long id, String name, String email, String department, String photoUrl,
                      String accountUsername, String studentNumber) {
        this(id, name, email, department, photoUrl);
        this.accountUsername = accountUsername;
        setStudentNumber(studentNumber);
    }
}
