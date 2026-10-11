package com.sms.studentms_backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sms.studentms_backend.dto.SchoolClassRequest;
import com.sms.studentms_backend.repository.*;
import com.sms.studentms_backend.service.CatalogService;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.stereotype.Component;
import java.util.ArrayList;

@Component
@Profile("localdemo")
public class CatalogInitializer implements ApplicationRunner {
    private final CatalogService catalog;
    private final SchoolClassRepository classes;
    private final CourseRepository courses;
    private final ObjectMapper mapper;
    @Value("${app.catalog-seed:}")
    private String catalogSeed = "";

    public CatalogInitializer(CatalogService catalog, SchoolClassRepository classes, CourseRepository courses, ObjectMapper mapper) {
        this.catalog = catalog; this.classes = classes; this.courses = courses; this.mapper = mapper;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (var input = catalogSeed.isBlank()
                ? new ClassPathResource("school-catalog-seed.json").getInputStream()
                : Files.newInputStream(Path.of(catalogSeed))) {
            for (var major : mapper.readTree(input)) {
                for (var schoolClass : major.path("classes")) {
                    if (classes.findByName(schoolClass.path("name").asText()).isPresent()) continue;
                    var codes = new ArrayList<String>();
                    for (var code : schoolClass.path("courseCodes")) {
                        if (courses.findByCode(code.asText()).isPresent()) codes.add(code.asText());
                    }
                    catalog.saveClass(new SchoolClassRequest(schoolClass.path("name").asText(),
                            major.path("name").asText(), codes));
                }
            }
        }
        catalog.migrateLegacyStudents();
    }
}
