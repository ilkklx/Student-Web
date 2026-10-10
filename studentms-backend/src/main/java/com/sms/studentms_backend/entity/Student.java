package com.sms.studentms_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.HashSet;
import java.util.Set;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDate;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String department;

    @Column(unique = true, length = 32)
    private String studentNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private SchoolClass schoolClass;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private User user;

    private String photoUrl;   // e.g., "/uploads/student-1.jpg"

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Set<Enrollment> enrollments = new HashSet<>();

    @Column
    private LocalDate birthDate;

    // New field for soft delete
    private boolean deleted = false;

}

