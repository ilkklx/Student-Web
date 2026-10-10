package com.sms.studentms_backend;

import com.sms.studentms_backend.dto.*;
import com.sms.studentms_backend.entity.*;
import com.sms.studentms_backend.repository.*;
import com.sms.studentms_backend.security.JwtUtil;
import com.sms.studentms_backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.TestSecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"file.upload-dir=target/review-test-photos", "jwt.secret="})
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class BackendReviewRegressionTest {
    @Autowired MockMvc mvc;
    @Autowired Environment environment;
    @Autowired StudentService service;
    @Autowired CatalogService catalog;
    @Autowired AccountService accounts;
    @Autowired StudentRepository students;
    @Autowired CourseRepository courses;
    @Autowired EnrollmentRepository enrollments;
    @Autowired SchoolClassRepository classes;
    @Autowired MajorRepository majors;
    @Autowired UserRepository users;
    @Autowired MigrationMarkerRepository migrations;
    @Autowired PlatformTransactionManager transactions;

    private StudentDTO student;
    private CourseDTO course;

    @BeforeEach
    void fixtures() {
        enrollments.deleteAll();
        students.deleteAll();
        classes.deleteAll();
        majors.deleteAll();
        courses.deleteAll();
        users.deleteAll();
        migrations.deleteAll();
        student = service.createStudent(new StudentDTO(null, "Review Student", "review@example.com", "Class One", null));
        course = service.createCourse(new CourseDTO(null, "REVIEW101", "Review Course", 3));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void malformedBodyAndMissingOrInvalidParametersProduce400() throws Exception {
        mvc.perform(post("/api/students").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/students/" + student.getId() + "/enroll"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/students/not-a-number")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/students/" + student.getId() + "/enroll").param("courseId", "invalid"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void frameworkNotFoundAndMethodNotAllowedRemain4xx() throws Exception {
        mvc.perform(get("/api/missing-route")).andExpect(status().isNotFound());
        mvc.perform(put("/api/courses")).andExpect(status().isMethodNotAllowed())
                .andExpect(header().exists("Allow"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void studentNumberOmissionPreservesAndExplicitNullClears() throws Exception {
        student.setStudentNumber("123456");
        service.updateStudent(student.getId(), student);
        String fields = "\"name\":\"Review Student\",\"email\":\"review@example.com\",\"department\":\"Class One\"";
        mvc.perform(put("/api/students/" + student.getId()).contentType(MediaType.APPLICATION_JSON).content("{" + fields + "}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.studentNumber").value("123456"));
        mvc.perform(put("/api/students/" + student.getId()).contentType(MediaType.APPLICATION_JSON)
                .content("{" + fields + ",\"studentNumber\":null}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.studentNumber").doesNotExist())
                .andExpect(jsonPath("$.studentNumberPresent").doesNotExist());
        assertNull(service.getStudentById(student.getId()).getStudentNumber());
    }

    @Test
    void clearedLegacyStudentNumberIsNotRecreatedByLaterStartup() {
        student.setEmail("123456789012@lingnan");
        service.updateStudent(student.getId(), student);
        catalog.migrateLegacyStudents();
        StudentDTO migrated = service.getStudentById(student.getId());
        assertEquals("123456789012", migrated.getStudentNumber());
        migrated.setStudentNumber(null);
        service.updateStudent(student.getId(), migrated);
        catalog.saveClass(new SchoolClassRequest("Class One", "Computing", List.of(course.getCode())));
        catalog.migrateLegacyStudents();
        catalog.migrateLegacyStudents();
        assertNull(service.getStudentById(student.getId()).getStudentNumber());
        assertEquals(1, migrations.count());
    }

    @Test
    void conditionalBackfillRejectsStaleEmailAndRetainsAdministrativeFields() {
        student.setEmail("123456789012@lingnan");
        service.updateStudent(student.getId(), student);
        Object[] candidate = students.findLegacyIdentityCandidates().get(0);
        student.setEmail("corrected@example.com");
        student.setName("Corrected Name");
        student.setStudentNumber("654321");
        service.updateStudent(student.getId(), student);
        service.deleteStudent(student.getId());
        int changed = new TransactionTemplate(transactions).execute(status -> students.fillMissingStudentNumber(
                (Long) candidate[0], (String) candidate[1], "123456789012"));
        assertEquals(0, changed);
        catalog.saveClass(new SchoolClassRequest("Class One", "Computing", List.of(course.getCode())));
        catalog.migrateLegacyStudents();
        Student retained = students.findById(student.getId()).orElseThrow();
        assertTrue(retained.isDeleted());
        assertEquals("Corrected Name", retained.getName());
        assertEquals("corrected@example.com", retained.getEmail());
        assertEquals("654321", retained.getStudentNumber());
    }

    @Test
    void failedBackfillDoesNotLeaveCompletedMigrationMarker() {
        student.setEmail("123456789012@lingnan");
        service.updateStudent(student.getId(), student);
        service.createStudent(new StudentDTO(null, "Already Numbered", "numbered@example.com", "Class Two", null, null, "123456789012"));
        assertThrows(DataIntegrityViolationException.class, () -> catalog.migrateLegacyStudents());
        assertFalse(migrations.existsById("legacy-student-numbers-v1"));
        assertNull(service.getStudentById(student.getId()).getStudentNumber());
    }

    @Test
    @WithMockUser(username = "historyteacher", roles = "TEACHER")
    void teacherCanReadOwnWithdrawnHistoryWithoutReadingProfileOrOtherCourses() throws Exception {
        accounts.createUser("historyteacher", "Password123!", "ROLE_TEACHER");
        accounts.createUser("otherteacher", "Password123!", "ROLE_TEACHER");
        service.assignTeacher(course.getId(), "historyteacher");
        service.enrollStudentInCourse(student.getId(), course.getId(), null);
        service.dropCourse(student.getId(), course.getId());
        CourseDTO otherCourse = service.createCourse(new CourseDTO(null, "REVIEW102", "Other Course", 2));
        service.assignTeacher(otherCourse.getId(), "otherteacher");
        service.enrollStudentInCourse(student.getId(), otherCourse.getId(), null);
        mvc.perform(get("/api/students/" + student.getId() + "/enrollments"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].courseId").value(course.getId()))
                .andExpect(jsonPath("$[0].withdrawn").value(true));
        mvc.perform(get("/api/students/" + student.getId())).andExpect(status().isForbidden());
        mvc.perform(get("/api/students/" + student.getId() + "/courses")).andExpect(status().isForbidden());
        mvc.perform(get("/api/students")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        service.deleteStudent(student.getId());
        mvc.perform(get("/api/students/" + student.getId() + "/enrollments")).andExpect(status().isForbidden());
    }

    private String storePhoto() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", bytes);
        return service.updateStudentPhoto(student.getId(), new MockMultipartFile("file", "review.png", "image/png", bytes.toByteArray())).getPhotoUrl();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void truncatedImageWithPngSignatureProduces400WithoutChangingStudentPhoto() throws Exception {
        byte[] truncated = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};
        mvc.perform(multipart("/api/students/" + student.getId() + "/photo")
                .file(new MockMultipartFile("file", "corrupt.png", "image/png", truncated)))
                .andExpect(status().isBadRequest());
        assertNull(service.getStudentById(student.getId()).getPhotoUrl());
    }

    @Test
    @WithMockUser(username = "sharedowner", roles = "STUDENT")
    void sharedLegacyPhotoCanBeReadByOwnerOfAnyActiveLinkedRecord() throws Exception {
        String photo = storePhoto();
        StudentDTO other = service.createStudent(new StudentDTO(null, "Shared Student", "shared@example.com", "Class Two", null));
        Student shared = students.findById(other.getId()).orElseThrow();
        shared.setPhotoUrl(photo);
        students.saveAndFlush(shared);
        accounts.bindStudent(other.getId(), "sharedowner", "Password123!");
        mvc.perform(get(photo)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
        TestSecurityContextHolder.setAuthentication(new UsernamePasswordAuthenticationToken("outsider", "",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))));
        mvc.perform(get(photo)).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void administratorCanReadDeletedStudentPhotoButStudentCannot() throws Exception {
        accounts.bindStudent(student.getId(), "deletedowner", "Password123!");
        String photo = storePhoto();
        service.deleteStudent(student.getId());
        mvc.perform(get(photo)).andExpect(status().isOk());
        TestSecurityContextHolder.setAuthentication(new UsernamePasswordAuthenticationToken("deletedowner", "",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))));
        mvc.perform(get(photo)).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void h2ConsoleIsDisabledAndDenied() throws Exception {
        assertEquals("127.0.0.1", environment.getProperty("server.address"));
        assertEquals("false", environment.getProperty("spring.h2.console.enabled"));
        assertEquals("false", environment.getProperty("spring.h2.console.settings.web-allow-others"));
        mvc.perform(get("/h2-console/")).andExpect(status().isForbidden());
    }

    @Test
    void ephemeralH2SigningKeysDoNotValidateAnotherRuntimeTokens() {
        MockEnvironment h2 = new MockEnvironment();
        h2.setActiveProfiles("h2");
        JwtUtil first = temporaryJwt(h2), second = temporaryJwt(h2);
        var user = new org.springframework.security.core.userdetails.User("reviewuser", "unused",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        String token = first.generateToken(user);
        assertTrue(first.validateToken(token, user));
        assertThrows(io.jsonwebtoken.JwtException.class, () -> second.validateToken(token, user));
    }

    private JwtUtil temporaryJwt(Environment env) {
        JwtUtil jwt = new JwtUtil();
        ReflectionTestUtils.setField(jwt, "secret", "");
        ReflectionTestUtils.setField(jwt, "expiration", 60000L);
        ReflectionTestUtils.setField(jwt, "environment", env);
        jwt.initializeSigningKey();
        return jwt;
    }
}
