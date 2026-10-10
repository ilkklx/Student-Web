package com.sms.studentms_backend.repository;

import com.sms.studentms_backend.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
    Optional<SchoolClass> findByName(String name);
}
