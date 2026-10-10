package com.sms.studentms_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "enrollments", uniqueConstraints = @UniqueConstraint(
        name = "uk_enrollment_student_course", columnNames = {"student_id", "course_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    private String grade;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean withdrawn = false;
}
