package com.sms.studentms_backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sms.studentms_backend.dto.SchoolClassRequest;
import com.sms.studentms_backend.entity.Course;
import com.sms.studentms_backend.repository.CourseRepository;
import com.sms.studentms_backend.repository.SchoolClassRepository;
import com.sms.studentms_backend.service.CatalogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

class CatalogInitializerTest {
    @TempDir Path temporary;

    @Test
    void publicDistributionDoesNotSeedRealClasses() throws Exception {
        var catalog = mock(CatalogService.class);
        var initializer = new CatalogInitializer(catalog, mock(SchoolClassRepository.class),
                mock(CourseRepository.class), new ObjectMapper());
        ReflectionTestUtils.setField(initializer, "catalogSeed", "");
        initializer.run(null);
        verify(catalog, never()).saveClass(any());
        verify(catalog).migrateLegacyStudents();
    }

    @Test
    void privateExternalCatalogRemainsUsableWithoutPackagingIt() throws Exception {
        var file = temporary.resolve("private-catalog.json");
        Files.writeString(file, "[{\"name\":\"Example major\",\"classes\":[{\"name\":\"Example class\",\"courseCodes\":[\"EXAMPLE-1\"]}]}]");
        var catalog = mock(CatalogService.class);
        var classes = mock(SchoolClassRepository.class);
        var courses = mock(CourseRepository.class);
        when(classes.findByName("Example class")).thenReturn(Optional.empty());
        when(courses.findByCode("EXAMPLE-1")).thenReturn(Optional.of(new Course()));
        var initializer = new CatalogInitializer(catalog, classes, courses, new ObjectMapper());
        ReflectionTestUtils.setField(initializer, "catalogSeed", file.toString());
        initializer.run(null);
        verify(catalog).saveClass(argThat((SchoolClassRequest request) ->
                request.name().equals("Example class") && request.major().equals("Example major")
                        && request.courseCodes().equals(java.util.List.of("EXAMPLE-1"))));
        verify(catalog).migrateLegacyStudents();
    }
}
