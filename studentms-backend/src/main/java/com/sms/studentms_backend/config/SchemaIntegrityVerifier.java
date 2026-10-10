package com.sms.studentms_backend.config;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

/** Hibernate update may silently skip failed unique-key DDL; verify the resulting schema. */
@Component
@Profile({"mysql", "localdemo"})
@DependsOn("entityManagerFactory")
public class SchemaIntegrityVerifier implements SmartInitializingSingleton {
    private final DataSource dataSource;

    public SchemaIntegrityVerifier(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void afterSingletonsInstantiated() {
        try (Connection connection = dataSource.getConnection()) {
            requireUnique(connection, "enrollments", Set.of("student_id", "course_id"));
            requireUnique(connection, "students", Set.of("student_number"));
            requireUnique(connection, "students", Set.of("user_id"));
        } catch (SQLException ex) {
            throw new IllegalStateException("Database schema verification failed; startup stopped before data initialization", ex);
        }
    }

    private void requireUnique(Connection connection, String tableName, Set<String> expected) throws SQLException {
        DatabaseMetaData metadata = connection.getMetaData();
        String catalog = connection.getCatalog();
        String schema = connection.getSchema();
        String actualTable = null;
        try (ResultSet tables = metadata.getTables(catalog, schema, "%", new String[]{"TABLE"})) {
            while (tables.next()) {
                if (tableName.equalsIgnoreCase(tables.getString("TABLE_NAME"))) {
                    actualTable = tables.getString("TABLE_NAME");
                    schema = tables.getString("TABLE_SCHEM");
                    break;
                }
            }
        }
        Map<String, Set<String>> indexes = new HashMap<>();
        if (actualTable != null) {
            try (ResultSet rows = metadata.getIndexInfo(catalog, schema, actualTable, true, false)) {
                while (rows.next()) {
                    String name = rows.getString("INDEX_NAME");
                    String column = rows.getString("COLUMN_NAME");
                    if (name != null && column != null && !rows.getBoolean("NON_UNIQUE")) {
                        indexes.computeIfAbsent(name, ignored -> new HashSet<>()).add(column.toLowerCase(Locale.ROOT));
                    }
                }
            }
        }
        if (indexes.values().stream().noneMatch(expected::equals)) {
            throw new IllegalStateException("Missing database unique constraint: " + tableName + expected
                    + "; startup stopped. Review the upgrade backup and database DDL errors before retrying.");
        }
    }
}
