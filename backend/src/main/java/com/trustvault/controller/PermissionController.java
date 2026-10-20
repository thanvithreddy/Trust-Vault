package com.trustvault.controller;

import com.trustvault.dto.DTOs.GrantPermissionRequest;
import com.trustvault.dto.DTOs.PermissionResponse;
import com.trustvault.model.User;
import com.trustvault.repository.UserRepository;
import com.trustvault.security.UserPrincipal;
import com.trustvault.service.PermissionManagementService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionManagementService permissionManagementService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<List<PermissionResponse>> listPermissions(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(permissionManagementService.listPermissions(documentId, user, request.getRemoteAddr()));
    }

    @PostMapping("/documents/{documentId}")
    public ResponseEntity<PermissionResponse> grantPermission(
            @PathVariable UUID documentId,
            @Valid @RequestBody GrantPermissionRequest grantRequest,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(permissionManagementService.grantPermission(documentId, grantRequest, user, request.getRemoteAddr()));
    }

    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<?> revokePermission(
            @PathVariable UUID documentId,
            @RequestParam String userEmail,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        permissionManagementService.revokePermission(documentId, userEmail, user, request.getRemoteAddr());
        return ResponseEntity.ok("Permission revoked immediately");
    }
}
