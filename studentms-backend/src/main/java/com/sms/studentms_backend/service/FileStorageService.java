package com.sms.studentms_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${file.upload-dir}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Could not create upload directory", ex);
        }
    }

    public String storeFile(MultipartFile file, Long studentId) {
        // Get original file extension
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        // Create unique filename: student-<id>-<uuid>.ext
        String newFilename = "student-" + studentId + "-" + UUID.randomUUID() + extension;

        Path targetLocation = this.fileStorageLocation.resolve(newFilename);
        try {
            Files.copy(file.getInputStream(), targetLocation);
            return "/profile-pictures/" + newFilename;   // ✅ matches folder name
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + newFilename, ex);
        }
    }
}