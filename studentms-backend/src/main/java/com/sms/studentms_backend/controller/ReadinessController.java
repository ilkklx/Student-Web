package com.sms.studentms_backend.controller;

import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class ReadinessController {
    private final ApplicationAvailability availability;

    public ReadinessController(ApplicationAvailability availability) {
        this.availability = availability;
    }

    @GetMapping("/api/health/ready")
    public ResponseEntity<Map<String, String>> ready() {
        boolean ready = availability.getReadinessState() == ReadinessState.ACCEPTING_TRAFFIC;
        return ResponseEntity.status(ready ? 200 : 503)
                .body(Map.of("status", ready ? "ready" : "starting"));
    }
}
