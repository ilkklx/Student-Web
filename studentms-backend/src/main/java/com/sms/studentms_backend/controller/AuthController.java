package com.sms.studentms_backend.controller;

import com.sms.studentms_backend.dto.LoginRequest;
import com.sms.studentms_backend.dto.StudentRegistrationRequest;
import com.sms.studentms_backend.entity.Student;
import com.sms.studentms_backend.entity.User;
import com.sms.studentms_backend.repository.StudentRepository;
import com.sms.studentms_backend.security.JwtUtil;
import com.sms.studentms_backend.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwt;
    private final AccountService accounts;
    private final StudentRepository students;
    private final com.sms.studentms_backend.repository.UserRepository users;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwt, AccountService accounts, StudentRepository students, com.sms.studentms_backend.repository.UserRepository users) {
        this.authenticationManager = authenticationManager; this.jwt = jwt;
        this.accounts = accounts; this.students = students;
        this.users = users;
    }

    private Map<String, Object> session(UserDetails user) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("username", user.getUsername());
        response.put("roleName", user.getAuthorities().stream()
                .map(a -> a.getAuthority()).sorted().findFirst().orElse("ROLE_STUDENT"));
        response.put("studentId", students.findByUserUsernameAndDeletedFalse(user.getUsername())
                .map(Student::getId).orElse(null));
        return response;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        UserDetails user = (UserDetails) authentication.getPrincipal();
        Map<String, Object> response = session(user);
        response.put("token", jwt.generateToken(user));
        return response;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        return session((UserDetails) authentication.getPrincipal());
    }

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> register(@RequestBody LoginRequest request, @RequestParam String roleName) {
        User user = accounts.createUser(request.getUsername(), request.getPassword(), roleName);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Account created", "username", user.getUsername()));
    }

    @GetMapping("/accounts")
    @PreAuthorize("hasRole('ADMIN')")
    public java.util.List<Map<String, Object>> accounts() {
        return users.findAll().stream().map(u -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("username", u.getUsername());
            result.put("roles", u.getRoles().stream().map(r -> r.getName()).sorted().toList());
            return result;
        }).toList();
    }

    @PostMapping("/register/student")
    public ResponseEntity<?> registerStudent(@Valid @RequestBody StudentRegistrationRequest request) {
        Student student = accounts.registerStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Student account created", "studentId", student.getId()));
    }
}
