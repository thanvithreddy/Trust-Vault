package com.trustvault.service;

import com.trustvault.audit.AuditService;
import com.trustvault.dto.DTOs.AISuggestionResponse;
import com.trustvault.dto.DTOs.ConfirmAISuggestionRequest;
import com.trustvault.dto.DTOs.GrantPermissionRequest;
import com.trustvault.dto.DTOs.PermissionResponse;
import com.trustvault.model.Document;
import com.trustvault.model.PermissionLevel;
import com.trustvault.model.Role;
import com.trustvault.model.User;
import com.trustvault.repository.DocumentRepository;
import com.trustvault.repository.UserRepository;
import com.trustvault.security.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AISuggestionService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final PermissionManagementService permissionManagementService;
    private final AuditService auditService;

    @Transactional
    public List<AISuggestionResponse> getSuggestions(UUID documentId, User owner, String clientIp) {
        Document doc = documentRepository.findByIdAndDeletedFalse(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        permissionService.enforceOwner(owner, doc, "AI_PERMISSION_SUGGESTION", clientIp);

        List<AISuggestionResponse> suggestions = new ArrayList<>();
        String category = doc.getCategory().toLowerCase();

        // Find candidate viewers in the system
        List<User> viewers = userRepository.findByRole(Role.ROLE_VIEWER);

        for (User viewer : viewers) {
            if (viewer.getId().equals(owner.getId())) continue;

            if ((category.contains("audit") || category.contains("financial")) && viewer.getEmail().contains("audit")) {
                suggestions.add(AISuggestionResponse.builder()
                        .suggestedUserEmail(viewer.getEmail())
                        .suggestedUserName(viewer.getFullName())
                        .suggestedPermission(PermissionLevel.READ)
                        .confidence(0.94)
                        .rationale(String.format("Document classified as '%s'. External auditor compliance mandates access.", doc.getCategory()))
                        .build());
            } else if ((category.contains("legal") || category.contains("contract")) && viewer.getEmail().contains("legal")) {
                suggestions.add(AISuggestionResponse.builder()
                        .suggestedUserEmail(viewer.getEmail())
                        .suggestedUserName(viewer.getFullName())
                        .suggestedPermission(PermissionLevel.READ)
                        .confidence(0.89)
                        .rationale("Document contains contractual clauses requiring Legal counsel review.")
                        .build());
            } else if (suggestions.isEmpty()) {
                suggestions.add(AISuggestionResponse.builder()
                        .suggestedUserEmail(viewer.getEmail())
                        .suggestedUserName(viewer.getFullName())
                        .suggestedPermission(PermissionLevel.READ)
                        .confidence(0.72)
                        .rationale(String.format("Standard team member review recommendation for '%s' category.", doc.getCategory()))
                        .build());
            }
        }

        // Non-Negotiable Rule: AI recommendations MUST be recorded in audit trail
        auditService.logEvent(
                owner.getId(),
                owner.getEmail(),
                owner.getRole().name(),
                "AI_PERMISSION_SUGGESTION",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                String.format("AI generated %d permission suggestions for document. Zero permissions applied autonomously.", suggestions.size())
        );

        return suggestions;
    }

    @Transactional
    public PermissionResponse confirmSuggestion(ConfirmAISuggestionRequest request, User owner, String clientIp) {
        Document doc = documentRepository.findByIdAndDeletedFalse(request.documentId())
                .orElseThrow(() -> new RuntimeException("Document not found"));

        permissionService.enforceOwner(owner, doc, "CONFIRM_AI_SUGGESTION", clientIp);

        if (!request.confirmed()) {
            auditService.logEvent(
                    owner.getId(),
                    owner.getEmail(),
                    owner.getRole().name(),
                    "AI_PERMISSION_REJECTED",
                    doc.getId(),
                    doc.getTitle(),
                    "SUCCESS",
                    clientIp,
                    String.format("Owner deliberately rejected AI suggestion to share with %s", request.userEmail())
            );
            return null;
        }

        // Human confirmed: grant the permission
        PermissionResponse response = permissionManagementService.grantPermission(
                doc.getId(),
                new GrantPermissionRequest(request.userEmail(), request.permissionLevel()),
                owner,
                clientIp
        );

        auditService.logEvent(
                owner.getId(),
                owner.getEmail(),
                owner.getRole().name(),
                "AI_PERMISSION_CONFIRMED",
                doc.getId(),
                doc.getTitle(),
                "SUCCESS",
                clientIp,
                String.format("Owner reviewed and confirmed AI suggestion: Granted %s to %s",
                        request.permissionLevel(), request.userEmail())
        );

        return response;
    }
}
