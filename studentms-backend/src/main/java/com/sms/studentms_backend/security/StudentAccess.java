package com.sms.studentms_backend.security;

import com.sms.studentms_backend.repository.StudentRepository;
import com.sms.studentms_backend.repository.EnrollmentRepository;
import com.sms.studentms_backend.repository.CourseRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component("studentAccess")
public class StudentAccess {
    private final StudentRepository students;
    private final EnrollmentRepository enrollments;
    private final CourseRepository courses;

    public StudentAccess(StudentRepository students, EnrollmentRepository enrollments, CourseRepository courses) {
        this.students = students; this.enrollments = enrollments; this.courses = courses;
    }

    private boolean role(Authentication auth, String role) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    @Transactional(readOnly = true)
    public boolean canReadPhoto(String filename, Authentication auth) {
        return students.findByPhotoUrlAndDeletedFalse("/profile-pictures/" + filename)
                .map(s -> role(auth, "ADMIN") || canRead(s.getId(), auth)).orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isOwner(Long id, Authentication auth) {
        return role(auth, "STUDENT") && students.findByUserUsernameAndDeletedFalse(auth.getName())
                .map(s -> s.getId().equals(id)).orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean canRead(Long id, Authentication auth) {
        return isOwner(id, auth) || (role(auth, "TEACHER")
                && enrollments.existsByStudentIdAndWithdrawnFalseAndCourseTeacherUsername(id, auth.getName()));
    }

    @Transactional(readOnly = true)
    public boolean canManageCourse(Long id, Authentication auth) {
        return role(auth, "TEACHER") && courses.findById(id)
                .map(c -> c.getTeacher() != null && c.getTeacher().getUsername().equals(auth.getName())).orElse(false);
    }
}
