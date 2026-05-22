package com.sms.studentms_backend.controller;

import com.sms.studentms_backend.dto.LoginRequest;
import com.sms.studentms_backend.dto.LoginResponse;
import com.sms.studentms_backend.entity.Role;
import com.sms.studentms_backend.entity.Student;
import com.sms.studentms_backend.entity.User;
import com.sms.studentms_backend.repository.RoleRepository;
import com.sms.studentms_backend.repository.UserRepository;
import com.sms.studentms_backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.sms.studentms_backend.dto.StudentRegistrationRequest;
import com.sms.studentms_backend.repository.StudentRepository;
import jakarta.validation.Valid;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private StudentRepository studentRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtUtil.generateToken(userDetails);

        // Extract the role name (e.g., "ROLE_ADMIN")
        String roleName = userDetails.getAuthorities().stream()
                .findFirst()
                .map(grantedAuthority -> grantedAuthority.getAuthority())
                .orElse("ROLE_USER");

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        response.put("roleName", roleName);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest request, @RequestParam String roleName) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
        Set<Role> roles = new HashSet<>();
        roles.add(role);
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRoles(roles);
        userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully");
    }

    @PostMapping("/register/student")
    public ResponseEntity<?> registerStudent(@Valid @RequestBody StudentRegistrationRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        Role role = roleRepository.findByName("ROLE_STUDENT")
                .orElseThrow(() -> new RuntimeException("Role STUDENT not found"));

        // Create User
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRoles(Set.of(role));
        user = userRepository.save(user);

        // Create Student
        Student student = new Student();
        student.setName(request.getName());
        student.setEmail(request.getEmail());
        student.setDepartment(request.getDepartment());
        student.setDeleted(false);
        Student savedStudent = studentRepository.save(student);

        // Return the student ID so frontend can auto‑link
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Student registered successfully");
        response.put("studentId", savedStudent.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    }
