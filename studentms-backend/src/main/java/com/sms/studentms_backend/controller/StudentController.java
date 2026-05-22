package com.sms.studentms_backend.controller;

import com.sms.studentms_backend.dto.CourseDTO;
import com.sms.studentms_backend.dto.EnrollmentDTO;
import com.sms.studentms_backend.dto.StudentDTO;
import com.sms.studentms_backend.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import com.sms.studentms_backend.dto.BulkDeleteDTO;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentService studentService;

    // GET all with pagination, sorting, search (Phase 3)
    @GetMapping
    public Page<StudentDTO> getAllStudents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String department
    ) {
        return studentService.getPaginatedStudents(page, size, sortBy, sortDir, name, department);
    }

    // GET single student
    @GetMapping("/{id}")
    public StudentDTO getStudentById(@PathVariable Long id) {
        return studentService.getStudentById(id);
    }

    // POST create student
    @PostMapping
    public ResponseEntity<StudentDTO> createStudent(@Valid @RequestBody StudentDTO studentDTO) {
        StudentDTO created = studentService.createStudent(studentDTO);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // PUT update student
    @PutMapping("/{id}")
    public StudentDTO updateStudent(@PathVariable Long id, @Valid @RequestBody StudentDTO studentDTO) {
        return studentService.updateStudent(id, studentDTO);
    }

    // DELETE student
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }

    // Upload photo for a student
    @PostMapping("/{id}/photo")
    public ResponseEntity<StudentDTO> uploadPhoto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        StudentDTO updated = studentService.updateStudentPhoto(id, file);
        return ResponseEntity.ok(updated);
    }

    // ========== Enrollment Endpoints ==========
    @PostMapping("/{studentId}/enroll")
    public ResponseEntity<EnrollmentDTO> enrollStudent(
            @PathVariable Long studentId,
            @RequestParam Long courseId,
            @RequestParam String grade) {
        return ResponseEntity.ok(studentService.enrollStudentInCourse(studentId, courseId, grade));
    }

    @DeleteMapping("/{studentId}/enroll/{courseId}")
    public ResponseEntity<Void> dropCourse(@PathVariable Long studentId, @PathVariable Long courseId) {
        studentService.dropCourse(studentId, courseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{studentId}/courses")
    public List<CourseDTO> getStudentCourses(@PathVariable Long studentId) {
        return studentService.getCoursesForStudent(studentId);
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<Void> bulkDeleteStudents(@RequestBody BulkDeleteDTO bulkDeleteDTO) {
        studentService.bulkDeleteStudents(bulkDeleteDTO.getIds());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportStudentsToCSV() {
        byte[] csvData = studentService.exportStudentsToCSV();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "students.csv");
        headers.setContentLength(csvData.length);

        return new ResponseEntity<>(csvData, headers, org.springframework.http.HttpStatus.OK);
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<Void> restoreStudent(@PathVariable Long id) {
        studentService.restoreStudent(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/deleted")
    public List<StudentDTO> getDeletedStudents() {
        return studentService.getDeletedStudents();
    }

}