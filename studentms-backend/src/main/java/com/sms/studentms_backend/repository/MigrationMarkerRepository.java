package com.sms.studentms_backend.repository;

import com.sms.studentms_backend.entity.MigrationMarker;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MigrationMarkerRepository extends JpaRepository<MigrationMarker, String> {}
