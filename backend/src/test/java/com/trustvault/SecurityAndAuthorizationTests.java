package com.trustvault;

import com.trustvault.audit.AuditService;
import com.trustvault.audit.ChainVerificationResult;
import com.trustvault.dto.DTOs.GrantPermissionRequest;
import com.trustvault.model.*;
import com.trustvault.repository.AuditLogRepository;
import com.trustvault.repository.DocumentPermissionRepository;
import com.trustvault.repository.DocumentRepository;
import com.trustvault.repository.UserRepository;
import com.trustvault.service.DocumentService;
import com.trustvault.service.PermissionManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class SecurityAndAuthorizationTests {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private PermissionManagementService permissionManagementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentPermissionRepository permissionRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuditService auditService;

    private User ownerAlice;
    private User viewerBob;
    private User rogueEve;
    private User adminSuper;
    private UUID secretDocId;

    @BeforeEach
    void setup() throws IOException {
        // Fetch or create users
        ownerAlice = userRepository.findByEmail("owner@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("owner@trustvault.local")
                        .password("Password123!")
                        .fullName("Alice Owner")
                        .role(Role.ROLE_OWNER)
                        .build()));

        viewerBob = userRepository.findByEmail("viewer@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("viewer@trustvault.local")
                        .password("Password123!")
                        .fullName("Bob Viewer")
                        .role(Role.ROLE_VIEWER)
                        .build()));

        rogueEve = userRepository.findByEmail("unauthorized@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("unauthorized@trustvault.local")
                        .password("Password123!")
                        .fullName("Eve Rogue")
                        .role(Role.ROLE_VIEWER)
                        .build()));

        adminSuper = userRepository.findByEmail("admin@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("admin@trustvault.local")
                        .password("Password123!")
                        .fullName("Super Admin")
                        .role(Role.ROLE_ADMIN)
                        .build()));

        // Upload a confidential document owned by Alice
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "executive_salaries.txt",
                "text/plain",
                "SECRET SALARIES: Alice: $250k, Bob: $90k".getBytes()
        );

        var docResponse = documentService.uploadDocument(
                file,
                "Executive Salaries 2026",
                "Highly confidential executive payroll figures",
                "Financials",
                ownerAlice,
                "127.0.0.1"
        );

        secretDocId = docResponse.id();
    }

    @Test
    @DisplayName("TV-TEST-01: Unauthorized user cannot read or download another user's document")
    void testUnauthorizedUserCannotReadOrDownloadOwnerDocument() {
        // Eve has no grant on Alice's document
        assertThrows(AccessDeniedException.class, () -> {
            documentService.streamDocument(secretDocId, rogueEve, "192.168.1.50");
        }, "Unauthorized user must be blocked with AccessDeniedException");

        assertThrows(AccessDeniedException.class, () -> {
            documentService.getDocument(secretDocId, rogueEve, "192.168.1.50");
        }, "Unauthorized user cannot inspect metadata");
    }

    @Test
    @DisplayName("TV-TEST-02: Instant Revocation - Taking access away works immediately (0-latency)")
    void testInstantRevocationTakesEffectImmediately() {
        // 1. Alice grants Bob READ access
        permissionManagementService.grantPermission(
                secretDocId,
                new GrantPermissionRequest(viewerBob.getEmail(), PermissionLevel.READ),
                ownerAlice,
                "127.0.0.1"
        );

        // 2. Bob can download document
        var payload = documentService.streamDocument(secretDocId, viewerBob, "127.0.0.1");
        assertNotNull(payload);
        assertEquals("executive_salaries.txt", payload.originalFilename());

        // 3. Alice immediately revokes Bob's access
        permissionManagementService.revokePermission(secretDocId, viewerBob.getEmail(), ownerAlice, "127.0.0.1");

        // 4. Bob's immediate subsequent attempt MUST fail
        assertThrows(AccessDeniedException.class, () -> {
            documentService.streamDocument(secretDocId, viewerBob, "127.0.0.1");
        }, "Revoked user must be rejected immediately on subsequent access");
    }

    @Test
    @DisplayName("TV-TEST-03: Provable Audit Trail - Refused attempts are recorded with DENIED status")
    void testRefusedAccessIsRecordedInAuditTrail() {
        long initialDeniedCount = auditLogRepository.findByStatusOrderByTimestampDesc("DENIED").size();

        // Attempt unauthorized access
        try {
            documentService.streamDocument(secretDocId, rogueEve, "10.0.0.99");
        } catch (AccessDeniedException ignored) {}

        List<AuditLog> deniedLogs = auditLogRepository.findByStatusOrderByTimestampDesc("DENIED");
        assertTrue(deniedLogs.size() > initialDeniedCount, "Refused access must create a DENIED audit log entry");

        AuditLog latestDenied = deniedLogs.get(0);
        assertEquals("ACCESS_REFUSED", latestDenied.getAction());
        assertEquals(rogueEve.getEmail(), latestDenied.getUserEmail());
        assertEquals("10.0.0.99", latestDenied.getIpAddress());
    }

    @Test
    @DisplayName("TV-TEST-04: Least Privilege - Administrator cannot read document without explicit grant")
    void testAdminCannotReadDocumentWithoutExplicitGrant() {
        // Admin user attempts to read Alice's confidential document
        assertThrows(AccessDeniedException.class, () -> {
            documentService.streamDocument(secretDocId, adminSuper, "127.0.0.1");
        }, "Administrator must not bypass document authorization without explicit grant");
    }

    @Test
    @DisplayName("TV-TEST-05: Non-Repudiation - Cryptographic audit hash chain verifies and detects tampering")
    void testAuditLogCryptographicChainVerification() {
        // Verify pristine state
        ChainVerificationResult verification = auditService.verifyIntegrity();
        assertTrue(verification.isValid(), "Cryptographic audit chain must be valid");
        assertTrue(verification.getTotalRecords() > 0, "Audit trail must have records");

        // Simulate tampering by altering an audit log entry in the database
        AuditLog victim = auditLogRepository.findAll().get(0);
        String originalDetails = victim.getDetails();
        victim.setDetails("TAMPERED DETAILS BY ROGUE ACTOR");
        auditLogRepository.save(victim);

        // Verification must detect the tampering
        ChainVerificationResult corruptedResult = auditService.verifyIntegrity();
        assertFalse(corruptedResult.isValid(), "Tampered record must be caught by hash chain verification");
        assertEquals(victim.getId(), corruptedResult.getCorruptedRecordId());

        // Restore for test cleanliness
        victim.setDetails(originalDetails);
        auditLogRepository.save(victim);
    }
}
