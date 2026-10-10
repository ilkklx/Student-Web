package com.sms.studentms_backend.service;

import com.sms.studentms_backend.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import javax.imageio.ImageIO;

@Service
public class FileStorageService {
    private final Path directory;
    public FileStorageService(@Value("${file.upload-dir}") String uploadDir) {
        directory = Paths.get(uploadDir).toAbsolutePath().normalize();
        try { Files.createDirectories(directory); }
        catch (IOException ex) { throw new IllegalStateException("Could not create upload directory", ex); }
    }

    public String storeFile(MultipartFile file, Long studentId) {
        if (file.isEmpty() || file.getSize() > 5L * 1024 * 1024) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Upload a JPG or PNG image up to 5MB");
        }
        try {
            byte[] bytes = file.getBytes();
            boolean png = bytes.length >= 8 && bytes[0] == (byte) 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G';
            boolean jpg = bytes.length >= 3 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8 && bytes[2] == (byte) 0xff;
            if ((!png && !jpg) || ImageIO.read(new ByteArrayInputStream(bytes)) == null) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Upload a valid JPG or PNG image");
            }
            String filename = "student-" + studentId + "-" + UUID.randomUUID() + (png ? ".png" : ".jpg");
            Files.write(directory.resolve(filename), bytes, StandardOpenOption.CREATE_NEW);
            return "/profile-pictures/" + filename;
        } catch (IOException ex) { throw new IllegalStateException("Could not store image", ex); }
    }
}
