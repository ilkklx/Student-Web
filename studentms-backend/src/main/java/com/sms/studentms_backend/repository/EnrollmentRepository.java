package com.sms.studentms_backend.repository;

import com.sms.studentms_backend.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    boolean existsByStudentIdAndWithdrawnFalseAndCourseTeacherUsername(Long studentId, String username);

    boolean existsByStudentIdAndStudentDeletedFalseAndCourseTeacherUsername(Long studentId, String username);

    Optional<Enrollment> findByStudentIdAndCourseId(Long studentId, Long courseId);

    @Modifying
    @Transactional
    void deleteByStudentIdAndCourseId(Long studentId, Long courseId);

    @Query("SELECT DISTINCT e FROM Enrollment e JOIN FETCH e.course WHERE e.student.id = :studentId")
    List<Enrollment> findByStudentIdWithCourse(@Param("studentId") Long studentId);

    @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.withdrawn = false AND e.student.deleted = false")
    long countTotalEnrollments();

    @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.withdrawn = false AND e.student.deleted = false AND e.course.teacher.username = :username")
    long countTeacherEnrollments(@Param("username") String username);

}
