package com.trustvault.security;

import com.trustvault.audit.AuditService;
import com.trustvault.model.*;
import com.trustvault.repository.DocumentPermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionService {

    private final DocumentPermissionRepository permissionRepository;
    private final AuditService auditService;

    /**
     * Real-time authorization check against the database.
     * Guaranteed 0-latency revocation check.
     */
    @Transactional(readOnly = true)
    public boolean hasAccess(User user, Document document, PermissionLevel requiredLevel) {
        if (user == null || document == null || Boolean.TRUE.equals(document.getDeleted())) {
            return false;
        }

        // 1. Document Owner always has full access
        if (document.getOwner().getId().equals(user.getId())) {
            return true;
        }

        // 2. Query active permission grant in real time
        Optional<DocumentPermission> grantOpt = permissionRepository.findByDocumentAndUserAndIsActiveTrue(document, user);
        if (grantOpt.isEmpty()) {
            return false;
        }

        DocumentPermission grant = grantOpt.get();

        // If EDIT is required, user must have EDIT permission
        if (requiredLevel == PermissionLevel.EDIT) {
            return grant.getPermissionLevel() == PermissionLevel.EDIT;
        }

        // If READ is required, both READ and EDIT grant levels satisfy
        return true;
    }

    /**
     * Enforces access. If unauthorized, logs the REFUSED attempt in the immutable audit log
     * and throws AccessDeniedException.
     */
    @Transactional(noRollbackFor = AccessDeniedException.class)
    public void enforceAccess(User user, Document document, PermissionLevel requiredLevel, String clientIp) {
        boolean allowed = hasAccess(user, document, requiredLevel);

        if (!allowed) {
            // Non-Negotiable Rule: Provable audit trail of refused access
            auditService.logEvent(
                    user != null ? user.getId() : null,
                    user != null ? user.getEmail() : "ANONYMOUS",
                    user != null ? user.getRole().name() : "NONE",
                    "ACCESS_REFUSED",
                    document != null ? document.getId() : null,
                    document != null ? document.getTitle() : "UNKNOWN",
                    "DENIED",
                    clientIp,
                    String.format("User attempted unauthorized %s access to document", requiredLevel)
            );

            log.warn("Security Alert: User {} denied {} access to document {}", 
                    user != null ? user.getEmail() : "anonymous", requiredLevel, document != null ? document.getId() : "null");
            throw new AccessDeniedException("Access denied: You do not have " + requiredLevel + " permissions for this document.");
        }
    }

    /**
     * Enforces that the user is the explicit owner of the document.
     */
    @Transactional(noRollbackFor = AccessDeniedException.class)
    public void enforceOwner(User user, Document document, String action, String clientIp) {
        if (user == null || document == null || !document.getOwner().getId().equals(user.getId())) {
            auditService.logEvent(
                    user != null ? user.getId() : null,
                    user != null ? user.getEmail() : "ANONYMOUS",
                    user != null ? user.getRole().name() : "NONE",
                    "OWNER_ACCESS_REFUSED",
                    document != null ? document.getId() : null,
                    document != null ? document.getTitle() : "UNKNOWN",
                    "DENIED",
                    clientIp,
                    String.format("Non-owner attempted restricted action: %s", action)
            );
            throw new AccessDeniedException("Forbidden: Only the document owner can perform " + action);
        }
    }
}
