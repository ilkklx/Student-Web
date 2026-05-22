package com.sms.studentms_backend.controller;

import com.sms.studentms_backend.dto.CourseDTO;
import com.sms.studentms_backend.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<CourseDTO> createCourse(@Valid @RequestBody CourseDTO courseDTO) {
        CourseDTO created = studentService.createCourse(courseDTO);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }
}