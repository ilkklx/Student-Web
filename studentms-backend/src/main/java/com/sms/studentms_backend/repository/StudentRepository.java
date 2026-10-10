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
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByIdAndDeletedFalse(Long id);

    Optional<Student> findByUserUsernameAndDeletedFalse(String username);

    boolean existsByUserId(Long userId);

    boolean existsByEmailIgnoreCase(String email);

    List<Student> findAllByDeletedFalse();

    long countByDepartmentAndDeletedFalse(String department);

    long countBySchoolClassIdAndDeletedFalse(Long classId);

    Optional<Student> findByUserUsername(String username);

    Optional<Student> findByPhotoUrlAndDeletedFalse(String photoUrl);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Student s WHERE s.id = :id AND s.deleted = false")
    Optional<Student> findActiveForUpdate(@Param("id") Long id);

    @Query("SELECT s FROM Student s WHERE s.deleted = false " +
            "AND (:term = '' OR LOWER(s.name) LIKE LOWER(CONCAT('%', :term, '%')) " +
            "OR LOWER(s.email) LIKE LOWER(CONCAT('%', :term, '%')) " +
            "OR s.studentNumber LIKE CONCAT('%', :term, '%')) " +
            "AND (:department = '' OR s.department = :department) " +
            "AND (:teacher = '' OR EXISTS (SELECT e.id FROM Enrollment e WHERE e.student = s " +
            "AND e.withdrawn = false AND e.course.teacher.username = :teacher))")
    Page<Student> searchActive(@Param("term") String term, @Param("department") String department,
                               @Param("teacher") String teacher, Pageable pageable);

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
