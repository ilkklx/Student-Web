package com.sms.studentms_backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sms.studentms_backend.dto.*;
import com.sms.studentms_backend.entity.*;
import com.sms.studentms_backend.exception.BusinessException;
import com.sms.studentms_backend.repository.*;
import com.sms.studentms_backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Set;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "file.upload-dir=target/test-photos")
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class BusinessFlowsIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccountService accounts;
    @Autowired StudentService service;
    @Autowired CatalogService catalog;
    @Autowired DashboardService dashboard;
    @Autowired UserRepository users;
    @Autowired StudentRepository students;
    @Autowired CourseRepository courses;
    @Autowired EnrollmentRepository enrollments;
    @Autowired SchoolClassRepository classes;
    @Autowired MajorRepository majors;

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
        student = service.createStudent(new StudentDTO(null, "Test Student", "student@example.com", "Class One", null));
        course = service.createCourse(new CourseDTO(null, "CS101", "Java", 3));
    }

    private String body(Object value) throws Exception { return json.writeValueAsString(value); }

    @Test
    void anonymousCannotRegisterAdmin() throws Exception {
        mvc.perform(post("/api/auth/register").param("roleName", "ROLE_ADMIN")
                .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"attacker\",\"password\":\"Password123!\"}"))
                .andExpect(status().isUnauthorized());
        assertFalse(users.findByUsername("attacker").isPresent());
    }

    @Test
    void publicRegistrationAlwaysCreatesLinkedStudent() throws Exception {
        mvc.perform(post("/api/auth/register/student").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newstudent\",\"password\":\"Password123!\",\"roleName\":\"ROLE_ADMIN\",\"name\":\"New Student\",\"email\":\"new@example.com\",\"department\":\"Class One\"}"))
                .andExpect(status().isCreated());
        User account = users.findByUsername("newstudent").orElseThrow();
        assertEquals(Set.of("ROLE_STUDENT"), account.getRoles().stream().map(Role::getName).collect(java.util.stream.Collectors.toSet()));
        assertNotNull(students.findByUserUsernameAndDeletedFalse("newstudent").orElseThrow().getId());
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newstudent\",\"password\":\"Password123!\"}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").isNumber()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(response).path("token").asText();
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("newstudent"));
    }

    @Test
    void duplicateStudentRegistrationDoesNotLeaveAccount() throws Exception {
        mvc.perform(post("/api/auth/register/student").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"duplicate\",\"password\":\"Password123!\",\"name\":\"New Student\",\"email\":\"student@example.com\",\"department\":\"Class One\"}"))
                .andExpect(status().isConflict());
        assertFalse(users.findByUsername("duplicate").isPresent());
    }

    @Test
    void databaseFailureRollsBackBothRegistrationWrites() {
        StudentRegistrationRequest request = new StudentRegistrationRequest();
        request.setUsername("rollback"); request.setPassword("Password123!");
        request.setName("X".repeat(300)); request.setEmail("rollback@example.com"); request.setDepartment("Class One");
        assertThrows(DataIntegrityViolationException.class, () -> accounts.registerStudent(request));
        assertFalse(users.findByUsername("rollback").isPresent());
        assertFalse(students.existsByEmailIgnoreCase("rollback@example.com"));
    }

    @Test
    void administratorCanBindExistingStudentWithoutDuplicatingRecord() {
        long before = students.count();
        accounts.createUser("existingstudent", "Password123!", "ROLE_STUDENT");
        accounts.bindStudent(student.getId(), "existingstudent", null);
        assertEquals(before, students.count());
        assertEquals(student.getId(), students.findByUserUsernameAndDeletedFalse("existingstudent").orElseThrow().getId());
        StudentDTO other = service.createStudent(new StudentDTO(null, "Other Student", "other@example.com", "Class Two", null));
        assertThrows(BusinessException.class, () -> accounts.bindStudent(other.getId(), "existingstudent", null));
    }

    @Test
    @WithMockUser(username = "self", roles = "STUDENT")
    void studentCanReadOnlyOwnProfileAndCannotManageOthers() throws Exception {
        accounts.bindStudent(student.getId(), "self", "Password123!");
        StudentDTO other = service.createStudent(new StudentDTO(null, "Other Student", "other@example.com", "Class Two", null));
        mvc.perform(get("/api/students/" + student.getId())).andExpect(status().isOk());
        mvc.perform(get("/api/students/" + other.getId())).andExpect(status().isForbidden());
        mvc.perform(get("/api/students")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/students/" + other.getId())).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/register").param("roleName", "ROLE_ADMIN")
                .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"eviladmin\",\"password\":\"Password123!\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "teacherone", roles = "TEACHER")
    void teacherCanManageOnlyAssignedCoursesAndRoster() throws Exception {
        accounts.createUser("teacherone", "Password123!", "ROLE_TEACHER");
        service.assignTeacher(course.getId(), "teacherone");
        service.enrollStudentInCourse(student.getId(), course.getId(), null);
        CourseDTO otherCourse = service.createCourse(new CourseDTO(null, "CS102", "Other Course", 2));
        StudentDTO other = service.createStudent(new StudentDTO(null, "Other Student", "other@example.com", "Class Two", null));
        service.enrollStudentInCourse(other.getId(), otherCourse.getId(), null);
        mvc.perform(get("/api/students")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/courses")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/dashboard/teacher")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudents").value(1)).andExpect(jsonPath("$.totalCourses").value(1));
        mvc.perform(patch("/api/students/" + student.getId() + "/enroll/" + course.getId() + "/grade").param("grade", "A"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/students/" + other.getId() + "/enroll/" + otherCourse.getId() + "/grade").param("grade", "A"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/students/" + other.getId())).andExpect(status().isForbidden());
        mvc.perform(delete("/api/students/" + student.getId())).andExpect(status().isForbidden());
    }

    @Test
    void duplicateEnrollmentIsRejectedAndDatabaseAlsoEnforcesUniqueness() {
        service.enrollStudentInCourse(student.getId(), course.getId(), null);
        assertThrows(BusinessException.class, () -> service.enrollStudentInCourse(student.getId(), course.getId(), null));
        Enrollment duplicate = new Enrollment();
        duplicate.setStudent(students.findById(student.getId()).orElseThrow());
        duplicate.setCourse(courses.findById(course.getId()).orElseThrow());
        assertThrows(DataIntegrityViolationException.class, () -> enrollments.saveAndFlush(duplicate));
        assertEquals(1, enrollments.count());
    }

    @Test
    void concurrentEnrollmentCreatesOnlyOneRecord() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> task = () -> {
            ready.countDown();
            start.await(5, TimeUnit.SECONDS);
            try { service.enrollStudentInCourse(student.getId(), course.getId(), null); return true; }
            catch (BusinessException ex) { assertEquals(409, ex.getStatus().value()); return false; }
        };
        try {
            Future<Boolean> first = pool.submit(task), second = pool.submit(task);
            assertTrue(ready.await(5, TimeUnit.SECONDS)); start.countDown();
            assertNotEquals(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
            assertEquals(1, enrollments.count());
        } finally { pool.shutdownNow(); }
    }

    @Test
    void withdrawalRetainsHistoryAndReenrollmentReusesTheRecord() {
        EnrollmentDTO initial = service.enrollStudentInCourse(student.getId(), course.getId(), null);
        assertNull(initial.getGrade());
        service.dropCourse(student.getId(), course.getId());
        assertTrue(service.getEnrollmentsForStudent(student.getId()).get(0).isWithdrawn());
        assertEquals(0, service.getCoursesForStudent(student.getId()).size());
        EnrollmentDTO restored = service.enrollStudentInCourse(student.getId(), course.getId(), null);
        assertEquals(initial.getId(), restored.getId());
        assertFalse(restored.isWithdrawn());
        assertEquals(1, enrollments.count());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void gradeIsSeparateVisibleAndPreventsWithdrawal() throws Exception {
        mvc.perform(post("/api/students/" + student.getId() + "/enroll").param("courseId", course.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.grade").doesNotExist());
        mvc.perform(patch("/api/students/" + student.getId() + "/enroll/" + course.getId() + "/grade").param("grade", "invalid"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/students/" + student.getId() + "/enroll/" + course.getId() + "/grade").param("grade", "B+"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/students/" + student.getId() + "/enrollments"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].grade").value("B+"));
        mvc.perform(delete("/api/students/" + student.getId() + "/enroll/" + course.getId()))
                .andExpect(status().isConflict());
        assertEquals(1, enrollments.count());
    }

    @Test
    void deletedStudentsCannotParticipateAndAreExcludedFromExportAndStatistics() {
        service.enrollStudentInCourse(student.getId(), course.getId(), null);
        service.deleteStudent(student.getId());
        assertThrows(com.sms.studentms_backend.exception.StudentNotFoundException.class, () -> service.getStudentById(student.getId()));
        assertThrows(com.sms.studentms_backend.exception.StudentNotFoundException.class, () -> service.enrollStudentInCourse(student.getId(), course.getId(), null));
        assertFalse(new String(service.exportStudentsToCSV(), java.nio.charset.StandardCharsets.UTF_8).contains("student@example.com"));
        assertEquals(0, dashboard.getDashboardStats().getTotalStudents());
        assertEquals(0, dashboard.getDashboardStats().getTotalEnrollments());
        assertEquals(1, enrollments.count());
        service.restoreStudent(student.getId());
        assertEquals(1, dashboard.getDashboardStats().getTotalEnrollments());
    }

    @Test
    void deletedStudentCannotLogInWithExistingCredentials() throws Exception {
        accounts.bindStudent(student.getId(), "deletedstudent", "Password123!");
        service.deleteStudent(student.getId());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"deletedstudent\",\"password\":\"Password123!\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void classOnlyAndEmailFiltersWorkIndependently() {
        service.createStudent(new StudentDTO(null, "Other Student", "other@example.com", "Class Two", null));
        assertEquals(1, service.getPaginatedStudents(0, 10, "id", "asc", null, "Class One").getTotalElements());
        assertEquals(1, service.getPaginatedStudents(0, 10, "id", "asc", "other@example", null).getTotalElements());
    }

    @Test
    void catalogCountsFollowCreateDeleteRestoreAndClassChange() {
        catalog.saveClass(new SchoolClassRequest("Class One", "Computing", List.of(course.getCode())));
        catalog.saveClass(new SchoolClassRequest("Class Two", "Computing", List.of()));
        assertEquals(1L, classes.findByName("Class One").map(c -> students.countBySchoolClassIdAndDeletedFalse(c.getId())).orElseThrow());
        service.deleteStudent(student.getId());
        assertEquals(0L, students.countBySchoolClassIdAndDeletedFalse(classes.findByName("Class One").orElseThrow().getId()));
        service.restoreStudent(student.getId());
        student.setDepartment("Class Two"); service.updateStudent(student.getId(), student);
        assertEquals(1L, students.countBySchoolClassIdAndDeletedFalse(classes.findByName("Class Two").orElseThrow().getId()));
        assertEquals(0L, students.countBySchoolClassIdAndDeletedFalse(classes.findByName("Class One").orElseThrow().getId()));
    }

    @Test
    void missingCourseInClassAssignmentDoesNotOverwriteExistingRelations() {
        catalog.saveClass(new SchoolClassRequest("Class One", "Computing", List.of(course.getCode())));
        assertThrows(BusinessException.class, () -> catalog.saveClass(new SchoolClassRequest("Class One", "Computing", List.of("MISSING"))));
        assertTrue(catalog.getCatalog().toString().contains("CS101"));
    }

    @Test
    void bulkDeletionIsAtomicWhenOneStudentDoesNotExist() {
        assertThrows(com.sms.studentms_backend.exception.StudentNotFoundException.class,
                () -> service.bulkDeleteStudents(List.of(student.getId(), Long.MAX_VALUE)));
        assertFalse(students.findById(student.getId()).orElseThrow().isDeleted());
    }

    @Test
    void malformedTokenProduces401AndDoesNotBreakPublicLogin() throws Exception {
        mvc.perform(get("/api/courses").header("Authorization", "Bearer malformed")).andExpect(status().isUnauthorized());
        accounts.createUser("loginuser", "Password123!", "ROLE_STUDENT");
        mvc.perform(post("/api/auth/login").header("Authorization", "Bearer malformed")
                .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"loginuser\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void accountListNeverReturnsPasswords() throws Exception {
        accounts.createUser("listeduser", "Password123!", "ROLE_TEACHER");
        mvc.perform(get("/api/auth/accounts")).andExpect(status().isOk()).andExpect(jsonPath("$[0].password").doesNotExist());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidCourseAndPaginationInputsProduce400() throws Exception {
        mvc.perform(post("/api/courses").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"\",\"title\":\"Course\",\"credits\":-1}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/students").param("size", "10000")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/students").param("sortBy", "missingField")).andExpect(status().isBadRequest());
    }

    @Test
    void combinedCourseAssignmentIsAtomic() {
        accounts.createUser("atomicteacher", "Password123!", "ROLE_TEACHER");
        assertThrows(BusinessException.class, () -> service.assignCourse(course.getId(), new CourseAssignmentRequest("atomicteacher", "Missing Class")));
        assertNull(service.getAllCourses().get(0).getTeacherUsername());
    }

    @Test
    void localDemoInitializationIsIdempotent() throws Exception {
        var initializer = new com.sms.studentms_backend.config.DemoAdminInitializer(users, accounts);
        org.springframework.test.util.ReflectionTestUtils.setField(initializer, "username", "test_demo_admin");
        org.springframework.test.util.ReflectionTestUtils.setField(initializer, "password", "Password123!");
        initializer.run(new org.springframework.boot.DefaultApplicationArguments());
        initializer.run(new org.springframework.boot.DefaultApplicationArguments());
        assertEquals(1, users.findAll().stream().filter(u -> u.getUsername().equals("test_demo_admin")).count());
        var catalogInitializer = new com.sms.studentms_backend.config.CatalogInitializer(catalog, classes, courses, json);
        var privateSeed = java.nio.file.Path.of("target/test-catalog/seed.json");
        java.nio.file.Files.createDirectories(privateSeed.getParent());
        java.nio.file.Files.writeString(privateSeed,
                "[{\"name\":\"Example Major\",\"classes\":[{\"name\":\"Example Class\",\"courseCodes\":[\"CS101\"]}]}]");
        org.springframework.test.util.ReflectionTestUtils.setField(catalogInitializer, "catalogSeed", privateSeed.toString());
        catalogInitializer.run(new org.springframework.boot.DefaultApplicationArguments());
        long count = classes.count();
        assertTrue(count > 0);
        catalogInitializer.run(new org.springframework.boot.DefaultApplicationArguments());
        assertEquals(count, classes.count());
    }

    @Test
    @WithMockUser(username = "photostudent", roles = "STUDENT")
    void photosRequireOwnershipAndValidImageContent() throws Exception {
        accounts.bindStudent(student.getId(), "photostudent", "Password123!");
        byte[] invalid = "not an image".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        mvc.perform(multipart("/api/students/" + student.getId() + "/photo")
                .file(new org.springframework.mock.web.MockMultipartFile("file", "fake.png", "image/png", invalid)))
                .andExpect(status().isBadRequest());
        var bytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(1, 1, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", bytes);
        String response = mvc.perform(multipart("/api/students/" + student.getId() + "/photo")
                .file(new org.springframework.mock.web.MockMultipartFile("file", "photo.png", "image/png", bytes.toByteArray())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String photoUrl = json.readTree(response).path("photoUrl").asText();
        mvc.perform(get(photoUrl)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
        StudentDTO other = service.createStudent(new StudentDTO(null, "Other Student", "otherphoto@example.com", "Class Two", null));
        mvc.perform(multipart("/api/students/" + other.getId() + "/photo")
                .file(new org.springframework.mock.web.MockMultipartFile("file", "photo.png", "image/png", bytes.toByteArray())))
                .andExpect(status().isForbidden());
        org.springframework.security.test.context.TestSecurityContextHolder.setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("otheraccount", "", java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STUDENT"))));
        mvc.perform(get(photoUrl)).andExpect(status().isForbidden());
        mvc.perform(get("/api" + photoUrl)).andExpect(status().isForbidden());
    }
}
