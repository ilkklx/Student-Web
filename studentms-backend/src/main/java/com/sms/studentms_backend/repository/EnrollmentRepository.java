package com.sms.studentms_backend.repository;

import com.sms.studentms_backend.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    @Modifying
    @Transactional
    void deleteByStudentIdAndCourseId(Long studentId, Long courseId);

    @Query("SELECT DISTINCT e FROM Enrollment e JOIN FETCH e.course WHERE e.student.id = :studentId")
    List<Enrollment> findByStudentIdWithCourse(@Param("studentId") Long studentId);

    @Query("SELECT COUNT(e) FROM Enrollment e")
    long countTotalEnrollments();

}