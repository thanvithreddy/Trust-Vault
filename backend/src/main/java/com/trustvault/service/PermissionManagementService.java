package com.trustvault.service;

import com.trustvault.audit.AuditService;
import com.trustvault.dto.DTOs.GrantPermissionRequest;
import com.trustvault.dto.DTOs.PermissionResponse;
import com.trustvault.model.*;
import com.trustvault.repository.DocumentPermissionRepository;
import com.trustvault.repository.DocumentRepository;
import com.trustvault.repository.UserRepository;
import com.trustvault.security.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionManagementService {

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;

    @Transactional
    public PermissionResponse grantPermission(
            UUID documentId,
            GrantPermissionRequest request,
            User actingUser,
            String clientIp
    ) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Server decides: Only the owner can grant access
        permissionService.enforceOwner(actingUser, doc, "GRANT_PERMISSION", clientIp);

        User targetUser = userRepository.findByEmail(request.userEmail())
                .orElseThrow(() -> new RuntimeException("Target user not found: " + request.userEmail()));

        if (targetUser.getId().equals(actingUser.getId())) {
            throw new IllegalArgumentException("Owner already possesses full access");
        }

        Optional<DocumentPermission> existingGrant = permissionRepository.findByDocumentAndUser(doc, targetUser);

        DocumentPermission permission;
        if (existingGrant.isPresent()) {
            permission = existingGrant.get();
            permission.setPermissionLevel(request.permissionLevel());
            permission.setIsActive(true);
            permission.setRevokedAt(null);
            permission.setGrantedBy(actingUser);
        } else {
            permission = DocumentPermission.builder()
                    .document(doc)
                    .user(targetUser)
                    .permissionLevel(request.permissionLevel())
                    .grantedBy(actingUser)
                    .isActive(true)
                    .build();
        }

        permission = permissionRepository.save(permission);

        auditService.logEvent(
                actingUser.getId(),
                actingUser.getEmail(),
                actingUser.getRole().name(),
                "PERMISSION_GRANT",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                String.format("Granted %s permission to %s", request.permissionLevel(), targetUser.getEmail())
        );

        return PermissionResponse.builder()
                .id(permission.getId())
                .userEmail(targetUser.getEmail())
                .userFullName(targetUser.getFullName())
                .permissionLevel(permission.getPermissionLevel())
                .grantedAt(permission.getGrantedAt())
                .isActive(permission.getIsActive())
                .build();
    }

    @Transactional
    public void revokePermission(
            UUID documentId,
            String targetUserEmail,
            User actingUser,
            String clientIp
    ) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Server decides: Only the owner can revoke access
        permissionService.enforceOwner(actingUser, doc, "REVOKE_PERMISSION", clientIp);

        User targetUser = userRepository.findByEmail(targetUserEmail)
                .orElseThrow(() -> new RuntimeException("Target user not found: " + targetUserEmail));

        Optional<DocumentPermission> existingGrant = permissionRepository.findByDocumentAndUserAndIsActiveTrue(doc, targetUser);

        if (existingGrant.isPresent()) {
            DocumentPermission permission = existingGrant.get();
            permission.setIsActive(false);
            permission.setRevokedAt(Instant.now());
            permissionRepository.save(permission);

            // Provable audit record of revocation
            auditService.logEvent(
                    actingUser.getId(),
                    actingUser.getEmail(),
                    actingUser.getRole().name(),
                    "PERMISSION_REVOKE",
                    doc.getId(),
                    doc.getTitle(),
                    "SUCCESS",
                    clientIp,
                    String.format("Revoked access from %s with immediate effect", targetUser.getEmail())
            );
        }
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> listPermissions(UUID documentId, User actingUser, String clientIp) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        permissionService.enforceOwner(actingUser, doc, "LIST_PERMISSIONS", clientIp);

        return permissionRepository.findByDocumentIdAndIsActiveTrue(documentId).stream()
                .map(p -> PermissionResponse.builder()
                        .id(p.getId())
                        .userEmail(p.getUser().getEmail())
                        .userFullName(p.getUser().getFullName())
                        .permissionLevel(p.getPermissionLevel())
                        .grantedAt(p.getGrantedAt())
                        .isActive(p.getIsActive())
                        .build())
                .collect(Collectors.toList());
    }
}
