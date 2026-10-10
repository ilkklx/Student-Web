package com.sms.studentms_backend.controller;

import com.sms.studentms_backend.dto.CourseDTO;
import com.sms.studentms_backend.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired
    private StudentService studentService;

    @GetMapping
    public List<CourseDTO> getAllCourses() {
        return studentService.getAllCourses();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CourseDTO> createCourse(@Valid @RequestBody CourseDTO courseDTO) {
        CourseDTO created = studentService.createCourse(courseDTO);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}/teacher")
    @PreAuthorize("hasRole('ADMIN')")
    public CourseDTO assignTeacher(@PathVariable Long id, @RequestParam String username) {
        return studentService.assignTeacher(id, username);
    }

    @PutMapping("/{id}/assignment")
    @PreAuthorize("hasRole('ADMIN')")
    public CourseDTO assignCourse(@PathVariable Long id, @Valid @RequestBody com.sms.studentms_backend.dto.CourseAssignmentRequest request) {
        return studentService.assignCourse(id, request);
    }
}
