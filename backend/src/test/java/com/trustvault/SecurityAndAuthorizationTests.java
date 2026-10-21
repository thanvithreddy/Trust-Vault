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

    private User ownerThanvith;
    private User viewerTej;
    private User roguePriya;
    private User adminAnanya;
    private UUID secretDocId;

    @BeforeEach
    void setup() throws IOException {
        // Fetch or create users with Indian personas
        ownerThanvith = userRepository.findByEmail("thanvith@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("thanvith@trustvault.local")
                        .password("Password123!")
                        .fullName("Thanvith Reddy")
                        .role(Role.ROLE_OWNER)
                        .build()));

        viewerTej = userRepository.findByEmail("tej@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("tej@trustvault.local")
                        .password("Password123!")
                        .fullName("Tej Sharma")
                        .role(Role.ROLE_VIEWER)
                        .build()));

        roguePriya = userRepository.findByEmail("priya@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("priya@trustvault.local")
                        .password("Password123!")
                        .fullName("Priya Patel")
                        .role(Role.ROLE_VIEWER)
                        .build()));

        adminAnanya = userRepository.findByEmail("admin@trustvault.local")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("admin@trustvault.local")
                        .password("Password123!")
                        .fullName("Ananya Iyer")
                        .role(Role.ROLE_ADMIN)
                        .build()));

        // Upload a confidential document owned by Thanvith
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "executive_salaries.txt",
                "text/plain",
                "SECRET SALARIES: Thanvith: ₹45L, Tej: ₹18L".getBytes()
        );

        var docResponse = documentService.uploadDocument(
                file,
                "Executive Compensation FY26",
                "Highly confidential executive payroll figures",
                "Financials",
                ownerThanvith,
                "127.0.0.1"
        );

        secretDocId = docResponse.id();
    }

    @Test
    @DisplayName("TV-TEST-01: Unauthorized user cannot read or download another user's document")
    void testUnauthorizedUserCannotReadOrDownloadOwnerDocument() {
        // Priya has no grant on Thanvith's document
        assertThrows(AccessDeniedException.class, () -> {
            documentService.streamDocument(secretDocId, roguePriya, "192.168.1.50");
        }, "Unauthorized user must be blocked with AccessDeniedException");

        assertThrows(AccessDeniedException.class, () -> {
            documentService.getDocument(secretDocId, roguePriya, "192.168.1.50");
        }, "Unauthorized user cannot inspect metadata");
    }

    @Test
    @DisplayName("TV-TEST-02: Instant Revocation - Taking access away works immediately (0-latency)")
    void testInstantRevocationTakesEffectImmediately() {
        // 1. Thanvith grants Tej READ access
        permissionManagementService.grantPermission(
                secretDocId,
                new GrantPermissionRequest(viewerTej.getEmail(), PermissionLevel.READ),
                ownerThanvith,
                "127.0.0.1"
        );

        // 2. Tej can download document
        var payload = documentService.streamDocument(secretDocId, viewerTej, "127.0.0.1");
        assertNotNull(payload);
        assertEquals("executive_salaries.txt", payload.originalFilename());

        // 3. Thanvith immediately revokes Tej's access
        permissionManagementService.revokePermission(secretDocId, viewerTej.getEmail(), ownerThanvith, "127.0.0.1");

        // 4. Tej's immediate subsequent attempt MUST fail
        assertThrows(AccessDeniedException.class, () -> {
            documentService.streamDocument(secretDocId, viewerTej, "127.0.0.1");
        }, "Revoked user must be rejected immediately on subsequent access");
    }

    @Test
    @DisplayName("TV-TEST-03: Provable Audit Trail - Refused attempts are recorded with DENIED status")
    void testRefusedAccessIsRecordedInAuditTrail() {
        long initialDeniedCount = auditLogRepository.findByStatusOrderByTimestampDesc("DENIED").size();

        // Attempt unauthorized access
        try {
            documentService.streamDocument(secretDocId, roguePriya, "10.0.0.99");
        } catch (AccessDeniedException ignored) {}

        List<AuditLog> deniedLogs = auditLogRepository.findByStatusOrderByTimestampDesc("DENIED");
        assertTrue(deniedLogs.size() > initialDeniedCount, "Refused access must create a DENIED audit log entry");

        AuditLog latestDenied = deniedLogs.get(0);
        assertEquals("ACCESS_REFUSED", latestDenied.getAction());
        assertEquals(roguePriya.getEmail(), latestDenied.getUserEmail());
        assertEquals("10.0.0.99", latestDenied.getIpAddress());
    }

    @Test
    @DisplayName("TV-TEST-04: Least Privilege - Administrator cannot read document without explicit grant")
    void testAdminCannotReadDocumentWithoutExplicitGrant() {
        // Admin user attempts to read Thanvith's confidential document
        assertThrows(AccessDeniedException.class, () -> {
            documentService.streamDocument(secretDocId, adminAnanya, "127.0.0.1");
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
