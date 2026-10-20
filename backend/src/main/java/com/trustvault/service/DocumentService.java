package com.trustvault.service;

import com.trustvault.audit.AuditService;
import com.trustvault.dto.DTOs.*;
import com.trustvault.model.*;
import com.trustvault.repository.DocumentPermissionRepository;
import com.trustvault.repository.DocumentRepository;
import com.trustvault.security.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final FileStorageService fileStorageService;
    private final PermissionService permissionService;
    private final AuditService auditService;

    @Transactional
    public DocumentResponse uploadDocument(
            MultipartFile file,
            String title,
            String description,
            String category,
            User owner,
            String clientIp
    ) throws IOException {
        // 1. Validate file and save using secure UUID blob storage
        FileStorageService.StoredFileResult stored = fileStorageService.storeFile(file);

        Document doc = Document.builder()
                .title(title)
                .description(description)
                .category(category)
                .originalFilename(file.getOriginalFilename())
                .storageFilename(stored.storageFilename())
                .fileSize(stored.size())
                .mimeType(stored.detectedMimeType())
                .checksumSha256(stored.checksumSha256())
                .owner(owner)
                .deleted(false)
                .build();

        doc = documentRepository.save(doc);

        // 2. Write immutable audit log
        auditService.logEvent(
                owner.getId(),
                owner.getEmail(),
                owner.getRole().name(),
                "DOCUMENT_UPLOAD",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                String.format("Uploaded document '%s' (%d bytes, SHA-256: %s)",
                        doc.getOriginalFilename(), doc.getFileSize(), doc.getChecksumSha256())
        );

        return toResponse(doc, owner);
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID documentId, User user, String clientIp) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Server decides, every time: Enforce READ access
        permissionService.enforceAccess(user, doc, PermissionLevel.READ, clientIp);

        auditService.logEvent(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                "DOCUMENT_READ",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                "Inspected document metadata"
        );

        return toResponse(doc, user);
    }

    public record DownloadPayload(Resource resource, String originalFilename, String mimeType, long size) {}

    @Transactional(readOnly = true)
    public DownloadPayload streamDocument(UUID documentId, User user, String clientIp) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Server decides, every time: Enforce READ access before returning stream
        permissionService.enforceAccess(user, doc, PermissionLevel.READ, clientIp);

        Resource resource = fileStorageService.loadAsResource(doc.getStorageFilename());

        // Provable audit record of file access
        auditService.logEvent(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                "DOCUMENT_DOWNLOAD",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                String.format("Streamed document '%s' (checksum: %s)", doc.getOriginalFilename(), doc.getChecksumSha256())
        );

        return new DownloadPayload(resource, doc.getOriginalFilename(), doc.getMimeType(), doc.getFileSize());
    }

    @Transactional
    public DocumentResponse updateDocument(UUID documentId, UpdateDocumentRequest request, User user, String clientIp) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Server decides, every time: Enforce EDIT access
        permissionService.enforceAccess(user, doc, PermissionLevel.EDIT, clientIp);

        doc.setTitle(request.title());
        doc.setDescription(request.description());
        doc.setCategory(request.category());

        doc = documentRepository.save(doc);

        auditService.logEvent(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                "DOCUMENT_EDIT",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                "Updated document metadata"
        );

        return toResponse(doc, user);
    }

    @Transactional
    public void deleteDocument(UUID documentId, User user, String clientIp) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Server decides: Only Owner can delete
        permissionService.enforceOwner(user, doc, "DOCUMENT_DELETE", clientIp);

        doc.setDeleted(true);
        documentRepository.save(doc);

        auditService.logEvent(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                "DOCUMENT_DELETE",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                "Soft-deleted document from active vault"
        );
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> searchDocuments(
            User user,
            String title,
            String category,
            String ownerEmail,
            Instant startDate,
            Instant endDate
    ) {
        List<Document> docs = documentRepository.searchAccessibleByUser(
                user,
                (title != null && !title.isBlank()) ? title : null,
                (category != null && !category.isBlank()) ? category : null,
                (ownerEmail != null && !ownerEmail.isBlank()) ? ownerEmail : null,
                startDate,
                endDate
        );

        return docs.stream().map(d -> toResponse(d, user)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getCategories() {
        return documentRepository.findAllCategories();
    }

    public DocumentResponse toResponse(Document doc, User user) {
        String level = "NONE";
        if (doc.getOwner().getId().equals(user.getId())) {
            level = "OWNER";
        } else {
            Optional<DocumentPermission> grant = permissionRepository.findByDocumentAndUserAndIsActiveTrue(doc, user);
            if (grant.isPresent()) {
                level = grant.get().getPermissionLevel().name();
            }
        }

        return DocumentResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .description(doc.getDescription())
                .category(doc.getCategory())
                .originalFilename(doc.getOriginalFilename())
                .fileSize(doc.getFileSize())
                .mimeType(doc.getMimeType())
                .checksumSha256(doc.getChecksumSha256())
                .ownerEmail(doc.getOwner().getEmail())
                .ownerFullName(doc.getOwner().getFullName())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .userPermissionLevel(level)
                .build();
    }
}
