package com.sms.studentms_backend.security;

import com.sms.studentms_backend.controller.ReadinessController;
import org.junit.jupiter.api.Test;
import org.springframework.boot.availability.ApplicationAvailabilityBean;
import org.springframework.boot.availability.AvailabilityChangeEvent;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReadinessFilterTest {
    @Test
    void businessRequestsCannotWriteBeforeInitializationOrDuringShutdown() throws Exception {
        var availability = new ApplicationAvailabilityBean();
        var filter = new ReadinessFilter(availability);
        var writes = new AtomicInteger();
        var request = new MockHttpServletRequest("POST", "/api/auth/register/student");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> writes.incrementAndGet());
        assertEquals(503, response.getStatus());
        assertEquals(0, writes.get());

        availability.onApplicationEvent(new AvailabilityChangeEvent<>(this, ReadinessState.ACCEPTING_TRAFFIC));
        response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> writes.incrementAndGet());
        assertEquals(200, response.getStatus());
        assertEquals(1, writes.get());

        availability.onApplicationEvent(new AvailabilityChangeEvent<>(this, ReadinessState.REFUSING_TRAFFIC));
        response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> writes.incrementAndGet());
        assertEquals(503, response.getStatus());
        assertEquals(1, writes.get());
    }

    @Test
    void readinessProbeReportsStartupAndCompletionWithoutLogin() throws Exception {
        var availability = new ApplicationAvailabilityBean();
        var controller = new ReadinessController(availability);
        var filter = new ReadinessFilter(availability);
        var request = new MockHttpServletRequest("GET", "/student-web/api/health/ready");
        request.setContextPath("/student-web");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> {
            assertEquals(503, controller.ready().getStatusCode().value());
            res.getWriter().write("probe reached controller");
        });
        assertEquals("probe reached controller", response.getContentAsString());

        availability.onApplicationEvent(new AvailabilityChangeEvent<>(this, ReadinessState.ACCEPTING_TRAFFIC));
        assertEquals(200, controller.ready().getStatusCode().value());
        assertEquals("ready", controller.ready().getBody().get("status"));
    }
}
