package com.sms.studentms_backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.sql.Connection;
import java.sql.Statement;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SchemaIntegrityVerifierTest {
    private DriverManagerDataSource schema(boolean enrollmentUnique, boolean numberUnique, boolean accountUnique) throws Exception {
        DriverManagerDataSource source = new DriverManagerDataSource(
                "jdbc:h2:mem:schema_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1;MODE=MySQL", "sa", "");
        try (Connection connection = source.getConnection(); Statement sql = connection.createStatement()) {
            sql.execute("CREATE TABLE students(id BIGINT PRIMARY KEY, student_number VARCHAR(32)"
                    + (numberUnique ? " UNIQUE" : "") + ", user_id BIGINT" + (accountUnique ? " UNIQUE" : "") + ")");
            sql.execute("CREATE TABLE enrollments(id BIGINT PRIMARY KEY, student_id BIGINT, course_id BIGINT"
                    + (enrollmentUnique ? ", UNIQUE(student_id,course_id)" : "") + ")");
        }
        return source;
    }

    @Test
    void validUniqueConstraintsPermitStartup() throws Exception {
        assertDoesNotThrow(new SchemaIntegrityVerifier(schema(true, true, true))::afterSingletonsInstantiated);
    }

    @Test
    void nonUniqueEnrollmentIndexDoesNotPassVerification() throws Exception {
        var source = schema(false, true, true);
        try (Connection connection = source.getConnection(); Statement sql = connection.createStatement()) {
            sql.execute("CREATE INDEX ordinary_enrollment_index ON enrollments(student_id,course_id)");
        }
        var error = assertThrows(IllegalStateException.class, new SchemaIntegrityVerifier(source)::afterSingletonsInstantiated);
        assertTrue(error.getMessage().contains("enrollments"));
    }

    @Test
    void unrelatedUniqueIndexDoesNotReplaceStudentIdentityConstraints() throws Exception {
        var error = assertThrows(IllegalStateException.class,
                new SchemaIntegrityVerifier(schema(true, false, true))::afterSingletonsInstantiated);
        assertTrue(error.getMessage().contains("student_number"));
        error = assertThrows(IllegalStateException.class,
                new SchemaIntegrityVerifier(schema(true, true, false))::afterSingletonsInstantiated);
        assertTrue(error.getMessage().contains("user_id"));
    }
}
