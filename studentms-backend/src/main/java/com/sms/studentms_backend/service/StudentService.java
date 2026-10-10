package com.sms.studentms_backend.service;

import com.sms.studentms_backend.dto.*;
import com.sms.studentms_backend.entity.*;
import com.sms.studentms_backend.exception.*;
import com.sms.studentms_backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@Transactional
public class StudentService {
    @Autowired private StudentRepository studentRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private FileStorageService fileStorageService;
    @Autowired private UserRepository userRepository;
    @Autowired private SchoolClassRepository schoolClassRepository;

    private StudentDTO convertToDTO(Student student) {
        StudentDTO dto = new StudentDTO(student.getId(), student.getName(), student.getEmail(),
                student.getDepartment(), student.getPhotoUrl());
        dto.setAccountUsername(student.getUser() == null ? null : student.getUser().getUsername());
        dto.setStudentNumber(student.getStudentNumber());
        return dto;
    }

    private CourseDTO convertToCourseDTO(Course course) {
        return new CourseDTO(course.getId(), course.getCode(), course.getTitle(), course.getCredits(),
                course.getTeacher() == null ? null : course.getTeacher().getUsername());
    }

    private EnrollmentDTO convertToEnrollmentDTO(Enrollment e) {
        return new EnrollmentDTO(e.getId(), e.getStudent().getId(), e.getCourse().getId(),
                e.getGrade(), e.getCourse().getCode(), e.getCourse().getTitle(),
                e.getCourse().getCredits(), e.isWithdrawn());
    }

    private Student active(Long id) {
        return studentRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new StudentNotFoundException(id));
    }

    private Student lockActive(Long id) {
        return studentRepository.findActiveForUpdate(id).orElseThrow(() -> new StudentNotFoundException(id));
    }

    private String teacherScope() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "";
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean teacher = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));
        return teacher && !admin ? auth.getName() : "";
    }

    @Transactional(readOnly = true)
    public Page<StudentDTO> getPaginatedStudents(int page, int size, String sortBy, String sortDir, String name, String department) {
        if (page < 0 || size < 1 || size > 100
                || !Set.of("id", "name", "email", "department", "studentNumber").contains(sortBy)
                || !Set.of("asc", "desc").contains(sortDir.toLowerCase(Locale.ROOT))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid page, size or sort parameters");
        }
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return studentRepository.searchActive(name == null ? "" : name.trim(),
                department == null ? "" : department.trim(), teacherScope(), PageRequest.of(page, size, sort))
                .map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public StudentDTO getStudentById(Long id) { return convertToDTO(active(id)); }

    public StudentDTO createStudent(StudentDTO dto) {
        Student student = new Student();
        student.setName(dto.getName().trim());
        student.setEmail(dto.getEmail().trim());
        student.setDepartment(dto.getDepartment() == null ? null : dto.getDepartment().trim());
        student.setStudentNumber(dto.getStudentNumber());
        student.setSchoolClass(schoolClassRepository.findByName(student.getDepartment() == null ? "" : student.getDepartment()).orElse(null));
        return convertToDTO(studentRepository.saveAndFlush(student));
    }

    public StudentDTO updateStudent(Long id, StudentDTO dto) {
        Student student = lockActive(id);
        student.setName(dto.getName().trim());
        student.setEmail(dto.getEmail().trim());
        student.setDepartment(dto.getDepartment() == null ? null : dto.getDepartment().trim());
        if (dto.hasStudentNumber()) student.setStudentNumber(dto.getStudentNumber());
        student.setSchoolClass(schoolClassRepository.findByName(student.getDepartment() == null ? "" : student.getDepartment()).orElse(null));
        return convertToDTO(studentRepository.saveAndFlush(student));
    }

    public StudentDTO updateStudentPhoto(Long id, MultipartFile file) {
        Student student = lockActive(id);
        student.setPhotoUrl(fileStorageService.storeFile(file, id));
        return convertToDTO(studentRepository.save(student));
    }

    public void deleteStudent(Long id) {
        Student student = lockActive(id);
        student.setDeleted(true);
        studentRepository.save(student);
    }

    @Transactional(readOnly = true)
    public List<CourseDTO> getAllCourses() {
        String teacher = teacherScope();
        return courseRepository.findAll().stream()
                .filter(c -> teacher.isEmpty() || (c.getTeacher() != null && c.getTeacher().getUsername().equals(teacher)))
                .map(this::convertToCourseDTO).toList();
    }

    public CourseDTO createCourse(CourseDTO dto) {
        Course course = new Course();
        course.setCode(dto.getCode().trim());
        course.setTitle(dto.getTitle().trim());
        course.setCredits(dto.getCredits());
        return convertToCourseDTO(courseRepository.saveAndFlush(course));
    }

    public CourseDTO assignTeacher(Long courseId, String username) {
        Course course = courseRepository.findById(courseId).orElseThrow(() ->
                new BusinessException(HttpStatus.NOT_FOUND, "Course not found"));
        if (username.isBlank()) {
            course.setTeacher(null);
            return convertToCourseDTO(courseRepository.save(course));
        }
        User teacher = userRepository.findByUsername(username.trim()).orElseThrow(() ->
                new BusinessException(HttpStatus.NOT_FOUND, "Teacher account not found"));
        if (teacher.getRoles().stream().noneMatch(r -> r.getName().equals("ROLE_TEACHER"))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "This account is not a teacher");
        }
        course.setTeacher(teacher);
        return convertToCourseDTO(courseRepository.save(course));
    }

    public CourseDTO assignCourse(Long courseId, CourseAssignmentRequest request) {
        CourseDTO dto = assignTeacher(courseId, request.teacherUsername());
        if (request.className() != null && !request.className().isBlank()) {
            SchoolClass schoolClass = schoolClassRepository.findByName(request.className().trim()).orElseThrow(() ->
                    new BusinessException(HttpStatus.NOT_FOUND, "Class not found"));
            schoolClass.getCourses().add(courseRepository.findById(courseId).orElseThrow());
            schoolClassRepository.save(schoolClass);
        }
        return dto;
    }

    public EnrollmentDTO enrollStudentInCourse(Long studentId, Long courseId, String grade) {
        Student student = lockActive(studentId);
        if (grade != null && !grade.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Enroll without a grade; record the grade separately");
        }
        Course course = courseRepository.findById(courseId).orElseThrow(() ->
                new BusinessException(HttpStatus.NOT_FOUND, "Course not found"));
        Enrollment enrollment = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId).orElse(null);
        if (enrollment != null && !enrollment.isWithdrawn()) {
            throw new BusinessException(HttpStatus.CONFLICT, "Student is already enrolled in this course");
        }
        if (enrollment == null) {
            enrollment = new Enrollment();
            enrollment.setStudent(student);
            enrollment.setCourse(course);
        }
        enrollment.setWithdrawn(false);
        return convertToEnrollmentDTO(enrollmentRepository.saveAndFlush(enrollment));
    }

    public EnrollmentDTO recordGrade(Long studentId, Long courseId, String grade) {
        lockActive(studentId);
        if (grade == null || !Set.of("A", "A+", "A-", "B", "B+", "B-", "C", "C+", "C-", "D", "F").contains(grade)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid grade");
        }
        Enrollment e = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)
                .filter(item -> !item.isWithdrawn()).orElseThrow(() ->
                        new BusinessException(HttpStatus.NOT_FOUND, "Active enrollment not found"));
        e.setGrade(grade);
        return convertToEnrollmentDTO(enrollmentRepository.save(e));
    }

    public void dropCourse(Long studentId, Long courseId) {
        lockActive(studentId);
        Enrollment e = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)
                .filter(item -> !item.isWithdrawn()).orElseThrow(() ->
                        new BusinessException(HttpStatus.NOT_FOUND, "Active enrollment not found"));
        if (e.getGrade() != null && !e.getGrade().isBlank()) {
            throw new BusinessException(HttpStatus.CONFLICT, "A graded enrollment cannot be withdrawn");
        }
        e.setWithdrawn(true);
        enrollmentRepository.save(e);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentDTO> getEnrollmentsForStudent(Long studentId) {
        active(studentId);
        String teacher = teacherScope();
        return enrollmentRepository.findByStudentIdWithCourse(studentId).stream()
                .filter(e -> teacher.isEmpty() || (e.getCourse().getTeacher() != null
                        && e.getCourse().getTeacher().getUsername().equals(teacher)))
                .map(this::convertToEnrollmentDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<CourseDTO> getCoursesForStudent(Long studentId) {
        active(studentId);
        String teacher = teacherScope();
        return enrollmentRepository.findByStudentIdWithCourse(studentId).stream()
                .filter(e -> !e.isWithdrawn())
                .map(Enrollment::getCourse)
                .filter(c -> teacher.isEmpty() || (c.getTeacher() != null && c.getTeacher().getUsername().equals(teacher)))
                .map(this::convertToCourseDTO).toList();
    }

    public void bulkDeleteStudents(List<Long> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > 100 || ids.stream().anyMatch(Objects::isNull)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Supply 1 to 100 student IDs");
        }
        for (Long id : ids.stream().distinct().sorted().toList()) deleteStudent(id);
    }

    @Transactional(readOnly = true)
    public byte[] exportStudentsToCSV() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(out, false, StandardCharsets.UTF_8);
        writer.println("ID,Name,Email,Department,Photo URL,Student Number");
        for (Student s : studentRepository.findAllByDeletedFalse()) {
            writer.printf("%d,%s,%s,%s,%s,%s%n", s.getId(), escapeCSV(s.getName()), escapeCSV(s.getEmail()),
                    escapeCSV(s.getDepartment()), escapeCSV(s.getPhotoUrl()), escapeCSV(s.getStudentNumber()));
        }
        writer.flush();
        return out.toByteArray();
    }

    private String escapeCSV(String value) {
        if (value == null) return "";
        String trimmed = value.stripLeading();
        if (!trimmed.isEmpty() && "=+-@".indexOf(trimmed.charAt(0)) >= 0) value = "'" + value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    public void restoreStudent(Long id) {
        Student student = studentRepository.findForUpdate(id).orElseThrow(() -> new StudentNotFoundException(id));
        student.setDeleted(false);
        studentRepository.save(student);
    }

    @Transactional(readOnly = true)
    public List<StudentDTO> getDeletedStudents() {
        return studentRepository.findAllDeleted().stream().map(this::convertToDTO).toList();
    }
}
