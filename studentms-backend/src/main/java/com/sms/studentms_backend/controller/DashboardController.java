package com.sms.studentms_backend.controller;

import com.sms.studentms_backend.dto.DashboardStatsDTO;
import com.sms.studentms_backend.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public DashboardStatsDTO getStats() {
        return dashboardService.getDashboardStats();
    }

    @GetMapping("/teacher")
    @PreAuthorize("hasRole('TEACHER')")
    public DashboardStatsDTO getTeacherStats(org.springframework.security.core.Authentication authentication) {
        return dashboardService.getTeacherStats(authentication.getName());
    }
}
