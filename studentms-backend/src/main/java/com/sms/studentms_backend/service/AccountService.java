package com.sms.studentms_backend.service;

import com.sms.studentms_backend.dto.StudentRegistrationRequest;
import com.sms.studentms_backend.entity.*;
import com.sms.studentms_backend.exception.BusinessException;
import com.sms.studentms_backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
public class AccountService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final StudentRepository students;
    private final PasswordEncoder encoder;
    private final SchoolClassRepository classes;

    public AccountService(UserRepository users, RoleRepository roles, StudentRepository students, PasswordEncoder encoder, SchoolClassRepository classes) {
        this.users = users; this.roles = roles; this.students = students; this.encoder = encoder;
        this.classes = classes;
    }

    @Transactional
    public User createUser(String username, String password, String roleName) {
        if (username == null || username.trim().length() < 3 || username.trim().length() > 100
                || password == null || password.length() < 8 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Use a username of 3–100 characters and a password of at least 8 characters (at most 72 UTF-8 bytes)");
        }
        if (!Set.of("ROLE_ADMIN", "ROLE_TEACHER", "ROLE_STUDENT").contains(roleName)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid role");
        }
        if (users.findByUsername(username.trim()).isPresent()) {
            throw new BusinessException(HttpStatus.CONFLICT, "Username already exists");
        }
        User user = new User();
        user.setUsername(username.trim());
        user.setPassword(encoder.encode(password));
        user.setRoles(Set.of(roles.findByName(roleName).orElseThrow(() ->
                new BusinessException(HttpStatus.BAD_REQUEST, "Role is not configured"))));
        return users.save(user);
    }

    @Transactional
    public Student registerStudent(StudentRegistrationRequest request) {
        if (students.existsByEmailIgnoreCase(request.getEmail().trim())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Student record already exists; ask an administrator to link your account");
        }
        User user = createUser(request.getUsername(), request.getPassword(), "ROLE_STUDENT");
        Student student = new Student();
        student.setName(request.getName().trim());
        student.setEmail(request.getEmail().trim());
        student.setDepartment(request.getDepartment().trim());
        student.setSchoolClass(classes.findByName(student.getDepartment()).orElse(null));
        student.setUser(user);
        return students.saveAndFlush(student);
    }

    @Transactional
    public void bindStudent(Long studentId, String username, String password) {
        Student student = students.findActiveForUpdate(studentId).orElseThrow(() ->
                new com.sms.studentms_backend.exception.StudentNotFoundException(studentId));
        if (student.getUser() != null) {
            throw new BusinessException(HttpStatus.CONFLICT, "This student already has a linked account");
        }
        if (username == null || username.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        User user = users.findByUsername(username.trim()).orElse(null);
        if (user == null) user = createUser(username, password, "ROLE_STUDENT");
        else if (user.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_STUDENT"))
                || user.getRoles().stream().anyMatch(r -> !r.getName().equals("ROLE_STUDENT"))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only a student account can be linked");
        }
        if (students.existsByUserId(user.getId())) {
            throw new BusinessException(HttpStatus.CONFLICT, "This account is already linked to another student");
        }
        student.setUser(user);
        students.saveAndFlush(student);
    }
}
