package com.trustvault.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private final Path storageLocation;
    private final Tika tika = new Tika();

    // Allowed mime types for secure enterprise documents
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "text/csv",
            "image/png",
            "image/jpeg"
    );

    public record StoredFileResult(String storageFilename, String detectedMimeType, String checksumSha256, long size) {}

    public FileStorageService(@Value("${trustvault.storage.path:storage/vault}") String path) {
        this.storageLocation = Paths.get(path).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
            log.info("Initialized secure vault storage at: {}", this.storageLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    public StoredFileResult storeFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file");
        }

        // 1. Inspect actual binary magic bytes using Apache Tika
        String detectedMimeType;
        try (InputStream is = file.getInputStream()) {
            detectedMimeType = tika.detect(is, file.getOriginalFilename());
        }

        if (!ALLOWED_MIME_TYPES.contains(detectedMimeType.toLowerCase())) {
            log.warn("Rejected file upload: Detected MIME type {} is not permitted", detectedMimeType);
            throw new SecurityException("Disallowed file type: " + detectedMimeType + ". Only PDF, Office documents, CSV, TXT, and PNG/JPEG are permitted.");
        }

        // 2. Generate unguessable internal storage UUID (Mitigates Path Traversal TV-T07)
        String storageFilename = UUID.randomUUID().toString() + ".blob";
        Path targetPath = this.storageLocation.resolve(storageFilename).normalize();

        if (!targetPath.startsWith(this.storageLocation)) {
            throw new SecurityException("Path traversal attempt detected!");
        }

        // 3. Compute SHA-256 while writing file
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }

        long bytesWritten;
        try (InputStream is = file.getInputStream();
             DigestInputStream dis = new DigestInputStream(is, digest)) {
            bytesWritten = Files.copy(dis, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        String checksumSha256 = HexFormat.of().formatHex(digest.digest());

        return new StoredFileResult(storageFilename, detectedMimeType, checksumSha256, bytesWritten);
    }

    public Resource loadAsResource(String storageFilename) {
        try {
            Path filePath = this.storageLocation.resolve(storageFilename).normalize();
            if (!filePath.startsWith(this.storageLocation)) {
                throw new SecurityException("Path traversal attempt detected!");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found or unreadable: " + storageFilename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error loading file: " + storageFilename, e);
        }
    }

    public void deleteFile(String storageFilename) {
        try {
            Path filePath = this.storageLocation.resolve(storageFilename).normalize();
            if (filePath.startsWith(this.storageLocation)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            log.error("Failed to delete physical file: {}", storageFilename, e);
        }
    }
}
