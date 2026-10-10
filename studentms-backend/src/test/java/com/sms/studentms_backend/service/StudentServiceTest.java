package com.sms.studentms_backend.service;

import com.sms.studentms_backend.dto.StudentDTO;
import com.sms.studentms_backend.entity.Student;
import com.sms.studentms_backend.exception.StudentNotFoundException;
import com.sms.studentms_backend.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private com.sms.studentms_backend.repository.SchoolClassRepository schoolClassRepository;

    @Mock
    private FileStorageService fileStorageService; // needed but not used in these tests

    @InjectMocks
    private StudentService studentService;

    private Student student;
    private StudentDTO studentDTO;

    @BeforeEach
    void setUp() {
        student = new Student();
        student.setId(1L);
        student.setName("John Doe");
        student.setEmail("john@example.com");
        student.setDepartment("CS");
        student.setDeleted(false);

        studentDTO = new StudentDTO();
        studentDTO.setId(null);
        studentDTO.setName("John Doe");
        studentDTO.setEmail("john@example.com");
        studentDTO.setDepartment("CS");
    }

    @Test
    void createStudent_ShouldSaveAndReturnDTO() {
        when(studentRepository.saveAndFlush(any(Student.class))).thenReturn(student);

        StudentDTO result = studentService.createStudent(studentDTO);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("John Doe", result.getName());
        verify(studentRepository, times(1)).saveAndFlush(any(Student.class));
    }

    @Test
    void getStudentById_WhenExists_ShouldReturnDTO() {
        when(studentRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(student));

        StudentDTO result = studentService.getStudentById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("john@example.com", result.getEmail());
    }

    @Test
    void getStudentById_WhenNotFound_ShouldThrowException() {
        when(studentRepository.findByIdAndDeletedFalse(99L)).thenReturn(Optional.empty());

        assertThrows(StudentNotFoundException.class, () -> studentService.getStudentById(99L));
    }

    @Test
    void deleteStudent_ShouldSetDeletedTrueAndSave() {
        when(studentRepository.findActiveForUpdate(1L)).thenReturn(Optional.of(student));
        when(studentRepository.save(any(Student.class))).thenReturn(student);

        studentService.deleteStudent(1L);

        assertTrue(student.isDeleted());
        verify(studentRepository, times(1)).save(student);
    }
}
