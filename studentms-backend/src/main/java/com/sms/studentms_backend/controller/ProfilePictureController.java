package com.sms.studentms_backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.nio.file.*;

@RestController
@RequestMapping({"/api/profile-pictures", "/profile-pictures"})
public class ProfilePictureController {
    private final Path directory;
    public ProfilePictureController(@Value("${file.upload-dir}") String uploadDir) {
        directory = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @GetMapping("/{filename:.+}")
    @PreAuthorize("@studentAccess.canReadPhoto(#filename, authentication)")
    public ResponseEntity<Resource> getImage(@PathVariable String filename) throws IOException {
        Path file = directory.resolve(filename).normalize();
        if (!file.startsWith(directory) || !file.getParent().equals(directory)) {
            return ResponseEntity.badRequest().build();
        }
        Resource resource = new UrlResource(file.toUri());
        if (!resource.exists() || !resource.isReadable()) return ResponseEntity.notFound().build();
        MediaType type = filename.toLowerCase().endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff").body(resource);
    }
}
