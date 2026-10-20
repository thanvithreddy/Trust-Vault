package com.trustvault.audit;

import com.trustvault.model.AuditLog;
import com.trustvault.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    /**
     * Uses Propagation.REQUIRES_NEW so that refused access attempts are committed
     * even if the calling method throws an AccessDeniedException or is marked readOnly.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public synchronized AuditLog logEvent(
            UUID userId,
            String userEmail,
            String userRole,
            String action,
            UUID documentId,
            String documentTitle,
            String status,
            String ipAddress,
            String details
    ) {
        // Truncate to millis to prevent DB precision serialization mismatches (nanos vs micros)
        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);

        // 1. Fetch latest previous hash to extend the cryptographic chain
        Optional<AuditLog> latestLog = auditLogRepository.findTopByOrderByTimestampDescIdDesc();
        String previousHash = latestLog.map(AuditLog::getCurrentHash).orElse(GENESIS_HASH);

        // 2. Compute SHA-256 hash for current entry
        String payloadToHash = String.join("|",
                previousHash,
                now.toString(),
                userId != null ? userId.toString() : "ANONYMOUS",
                userRole != null ? userRole : "NONE",
                action,
                documentId != null ? documentId.toString() : "NONE",
                status,
                details != null ? details : ""
        );

        String currentHash = computeSha256(payloadToHash);

        AuditLog auditLog = AuditLog.builder()
                .timestamp(now)
                .userId(userId)
                .userEmail(userEmail)
                .userRole(userRole)
                .action(action)
                .documentId(documentId)
                .documentTitle(documentTitle)
                .status(status)
                .ipAddress(ipAddress)
                .details(details)
                .previousHash(previousHash)
                .currentHash(currentHash)
                .build();

        return auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public ChainVerificationResult verifyIntegrity() {
        List<AuditLog> allLogs = auditLogRepository.findAllByOrderByTimestampAscIdAsc();

        if (allLogs.isEmpty()) {
            return ChainVerificationResult.builder()
                    .valid(true)
                    .totalRecords(0)
                    .details("Audit log chain is empty.")
                    .build();
        }

        String expectedPreviousHash = GENESIS_HASH;

        for (int i = 0; i < allLogs.size(); i++) {
            AuditLog current = allLogs.get(i);

            // Verify previous hash link
            if (!current.getPreviousHash().equals(expectedPreviousHash)) {
                return ChainVerificationResult.builder()
                        .valid(false)
                        .totalRecords(allLogs.size())
                        .corruptedRecordId(current.getId())
                        .details(String.format("Chain broken at index %d (ID: %s). Expected previous hash %s, found %s.",
                                i, current.getId(), expectedPreviousHash, current.getPreviousHash()))
                        .build();
            }

            // Verify record content hash integrity
            String payloadToHash = String.join("|",
                    current.getPreviousHash(),
                    current.getTimestamp().toString(),
                    current.getUserId() != null ? current.getUserId().toString() : "ANONYMOUS",
                    current.getUserRole() != null ? current.getUserRole() : "NONE",
                    current.getAction(),
                    current.getDocumentId() != null ? current.getDocumentId().toString() : "NONE",
                    current.getStatus(),
                    current.getDetails() != null ? current.getDetails() : ""
            );

            String recomputedHash = computeSha256(payloadToHash);
            if (!current.getCurrentHash().equals(recomputedHash)) {
                return ChainVerificationResult.builder()
                        .valid(false)
                        .totalRecords(allLogs.size())
                        .corruptedRecordId(current.getId())
                        .details(String.format("Data tampering detected at index %d (ID: %s). Stored hash %s does not match recomputed hash %s.",
                                i, current.getId(), current.getCurrentHash(), recomputedHash))
                        .build();
            }

            expectedPreviousHash = current.getCurrentHash();
        }

        return ChainVerificationResult.builder()
                .valid(true)
                .totalRecords(allLogs.size())
                .details("Cryptographic audit trail is 100% verified. Zero tampering detected.")
                .build();
    }

    public static String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encodedhash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
