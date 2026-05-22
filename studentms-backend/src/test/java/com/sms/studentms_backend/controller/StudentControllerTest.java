package com.sms.studentms_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sms.studentms_backend.dto.StudentDTO;
import com.sms.studentms_backend.service.StudentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class StudentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StudentService studentService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = "ADMIN")
    void createStudent_ShouldReturnCreated() throws Exception {
        StudentDTO dto = new StudentDTO();
        dto.setName("Test");
        dto.setEmail("test@test.com");
        dto.setDepartment("CS");

        StudentDTO saved = new StudentDTO();
        saved.setId(1L);
        saved.setName("Test");
        saved.setEmail("test@test.com");
        saved.setDepartment("CS");

        when(studentService.createStudent(any(StudentDTO.class))).thenReturn(saved);

        mockMvc.perform(post("/api/students")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Test"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getStudentById_WhenNotFound_ShouldReturn404() throws Exception {
        when(studentService.getStudentById(99L)).thenThrow(new RuntimeException("Student not found"));

        mockMvc.perform(get("/api/students/99"))
                .andExpect(status().isNotFound());
    }
}