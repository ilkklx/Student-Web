package com.sms.studentms_backend.repository;

import com.sms.studentms_backend.entity.Student;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    // Active students only
    Page<Student> findByDeletedFalse(Pageable pageable);

    Page<Student> findByNameContainingIgnoreCaseAndDepartmentAndDeletedFalse(
            String name, String department, Pageable pageable);

    Page<Student> findByNameContainingIgnoreCaseAndDeletedFalse(String name, Pageable pageable);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.deleted = false")
    long countTotalStudents();

    @Query("SELECT s.department, COUNT(s) FROM Student s WHERE s.deleted = false GROUP BY s.department")
    List<Object[]> countStudentsByDepartment();

    @Query("SELECT AVG(YEAR(CURRENT_DATE) - YEAR(s.birthDate)) FROM Student s WHERE s.birthDate IS NOT NULL AND s.deleted = false")
    Double getAverageAge();

    @Modifying
    @Transactional
    @Query("UPDATE Student s SET s.deleted = false WHERE s.id = :id")
    void restoreById(@Param("id") Long id);

    // This one returns soft-deleted students – no extra condition
    @Query("SELECT s FROM Student s WHERE s.deleted = true")
    List<Student> findAllDeleted();
}