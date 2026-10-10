package com.sms.studentms_backend.repository;

import com.sms.studentms_backend.entity.Major;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MajorRepository extends JpaRepository<Major, Long> {
    Optional<Major> findByName(String name);
}
