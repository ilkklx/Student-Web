package com.sms.studentms_backend.repository;

import com.sms.studentms_backend.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {

    @Query("SELECT COUNT(c) FROM Course c")
    long countTotalCourses();
}