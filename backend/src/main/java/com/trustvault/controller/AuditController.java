package com.trustvault.controller;

import com.trustvault.audit.AuditService;
import com.trustvault.audit.ChainVerificationResult;
import com.trustvault.dto.DTOs.AuditLogResponse;
import com.trustvault.model.AuditLog;
import com.trustvault.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AuditController {

    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;

    @GetMapping("/logs")
    public ResponseEntity<List<AuditLogResponse>> getLogs(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID documentId,
            @RequestParam(required = false) UUID userId
    ) {
        List<AuditLog> logs;

        if (status != null && !status.isBlank()) {
            logs = auditLogRepository.findByStatusOrderByTimestampDesc(status.toUpperCase());
        } else if (documentId != null) {
            logs = auditLogRepository.findByDocumentIdOrderByTimestampDesc(documentId);
        } else if (userId != null) {
            logs = auditLogRepository.findByUserIdOrderByTimestampDesc(userId);
        } else {
            logs = auditLogRepository.findAllByOrderByTimestampDesc();
        }

        List<AuditLogResponse> response = logs.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify")
    public ResponseEntity<ChainVerificationResult> verifyAuditChainIntegrity() {
        return ResponseEntity.ok(auditService.verifyIntegrity());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAuditStats() {
        List<AuditLog> allLogs = auditLogRepository.findAll();
        long totalEvents = allLogs.size();
        long deniedAttempts = allLogs.stream().filter(l -> "DENIED".equalsIgnoreCase(l.getStatus())).count();
        long downloads = allLogs.stream().filter(l -> "DOCUMENT_DOWNLOAD".equalsIgnoreCase(l.getAction())).count();
        long permissionChanges = allLogs.stream().filter(l -> l.getAction().startsWith("PERMISSION_")).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEvents", totalEvents);
        stats.put("deniedAttempts", deniedAttempts);
        stats.put("totalDownloads", downloads);
        stats.put("permissionChanges", permissionChanges);

        return ResponseEntity.ok(stats);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .timestamp(log.getTimestamp())
                .userId(log.getUserId())
                .userEmail(log.getUserEmail())
                .userRole(log.getUserRole())
                .action(log.getAction())
                .documentId(log.getDocumentId())
                .documentTitle(log.getDocumentTitle())
                .status(log.getStatus())
                .ipAddress(log.getIpAddress())
                .details(log.getDetails())
                .previousHash(log.getPreviousHash())
                .currentHash(log.getCurrentHash())
                .build();
    }
}
