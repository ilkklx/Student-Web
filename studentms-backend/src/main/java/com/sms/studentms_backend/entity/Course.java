package com.sms.studentms_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "courses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;   // e.g., "CS101"

    @Column(nullable = false)
    private String title;  // e.g., "Introduction to Programming"

    private Integer credits;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private User teacher;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Set<Enrollment> enrollments = new HashSet<>();
}
