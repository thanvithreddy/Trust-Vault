package com.trustvault.dto;

import com.trustvault.model.PermissionLevel;
import com.trustvault.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.Instant;
import java.util.UUID;

public class DTOs {

    // --- Auth DTOs ---
    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotBlank String fullName,
            @NotNull Role role
    ) {}

    @Builder
    public record AuthResponse(
            String token,
            String type,
            UUID id,
            String email,
            String fullName,
            String role
    ) {}

    // --- Document DTOs ---
    @Builder
    public record DocumentResponse(
            UUID id,
            String title,
            String description,
            String category,
            String originalFilename,
            Long fileSize,
            String mimeType,
            String checksumSha256,
            String ownerEmail,
            String ownerFullName,
            Instant createdAt,
            Instant updatedAt,
            String userPermissionLevel // "OWNER", "EDIT", "READ"
    ) {}

    public record UpdateDocumentRequest(
            @NotBlank String title,
            String description,
            @NotBlank String category
    ) {}

    public record GrantPermissionRequest(
            @NotBlank @Email String userEmail,
            @NotNull PermissionLevel permissionLevel
    ) {}

    @Builder
    public record PermissionResponse(
            UUID id,
            String userEmail,
            String userFullName,
            PermissionLevel permissionLevel,
            Instant grantedAt,
            Boolean isActive
    ) {}

    // --- Audit DTOs ---
    @Builder
    public record AuditLogResponse(
            UUID id,
            Instant timestamp,
            UUID userId,
            String userEmail,
            String userRole,
            String action,
            UUID documentId,
            String documentTitle,
            String status,
            String ipAddress,
            String details,
            String previousHash,
            String currentHash
    ) {}

    // --- AI Suggestion DTOs ---
    @Builder
    public record AISuggestionResponse(
            String suggestedUserEmail,
            String suggestedUserName,
            PermissionLevel suggestedPermission,
            double confidence,
            String rationale
    ) {}

    public record ConfirmAISuggestionRequest(
            @NotNull UUID documentId,
            @NotBlank @Email String userEmail,
            @NotNull PermissionLevel permissionLevel,
            @NotNull Boolean confirmed
    ) {}
}
