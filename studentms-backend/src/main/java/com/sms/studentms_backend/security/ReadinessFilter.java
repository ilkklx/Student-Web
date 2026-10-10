package com.sms.studentms_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReadinessFilter extends OncePerRequestFilter {
    private final ApplicationAvailability availability;

    public ReadinessFilter(ApplicationAvailability availability) {
        this.availability = availability;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        boolean readinessRequest = "GET".equals(request.getMethod()) && "/api/health/ready".equals(path);
        if (!readinessRequest && availability.getReadinessState() != ReadinessState.ACCEPTING_TRAFFIC) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":\"starting\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
