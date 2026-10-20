package com.trustvault.config;

import com.trustvault.audit.AuditService;
import com.trustvault.model.*;
import com.trustvault.repository.DocumentPermissionRepository;
import com.trustvault.repository.DocumentRepository;
import com.trustvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Value("${trustvault.storage.path:storage/vault}")
    private String storagePath;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0) {
            log.info("Database already seeded. Skipping initial seeding.");
            return;
        }

        log.info("Seeding initial TrustVault demonstration data...");

        // Ensure vault physical directory exists
        Path vaultDir = Paths.get(storagePath).toAbsolutePath().normalize();
        Files.createDirectories(vaultDir);

        String commonPassword = passwordEncoder.encode("Password123!");

        // 1. Seed Users
        User admin = userRepository.save(User.builder()
                .email("admin@trustvault.local")
                .password(commonPassword)
                .fullName("System Administrator")
                .role(Role.ROLE_ADMIN)
                .build());

        User owner = userRepository.save(User.builder()
                .email("owner@trustvault.local")
                .password(commonPassword)
                .fullName("Alice Owner (CFO)")
                .role(Role.ROLE_OWNER)
                .build());

        User viewer = userRepository.save(User.builder()
                .email("viewer@trustvault.local")
                .password(commonPassword)
                .fullName("Bob Viewer (Contractor)")
                .role(Role.ROLE_VIEWER)
                .build());

        User auditor = userRepository.save(User.builder()
                .email("auditor@trustvault.local")
                .password(commonPassword)
                .fullName("Carol Auditor (KPMG)")
                .role(Role.ROLE_VIEWER)
                .build());

        User unauthorized = userRepository.save(User.builder()
                .email("unauthorized@trustvault.local")
                .password(commonPassword)
                .fullName("Eve Rogue (Ex-Employee)")
                .role(Role.ROLE_VIEWER)
                .build());

        auditService.logEvent(
                admin.getId(),
                admin.getEmail(),
                admin.getRole().name(),
                "SYSTEM_INITIALIZE",
                null,
                null,
                "SUCCESS",
                "127.0.0.1",
                "Seeded administrative, owner, and viewer demonstration identities"
        );

        // 2. Seed Sample Files in Vault Storage
        String blob1 = UUID.randomUUID() + ".blob";
        String blob2 = UUID.randomUUID() + ".blob";

        Files.writeString(vaultDir.resolve(blob1), "CONFIDENTIAL FINANCIAL REPORT - Q3 PAYROLL AND BALANCE SHEET\nPrepared for Board of Directors only.");
        Files.writeString(vaultDir.resolve(blob2), "MASTER SERVICES AGREEMENT\nBetween TrustVault Corp and Apex Consulting LLC.\nClause 1: Confidentiality non-disclosure...");

        Document doc1 = documentRepository.save(Document.builder()
                .title("Q3 Financial Statements & Executive Payroll")
                .description("Confidential executive compensation figures and company financial performance balance sheet.")
                .category("Financials")
                .originalFilename("Q3_Financial_Payroll.txt")
                .storageFilename(blob1)
                .fileSize((long) Files.size(vaultDir.resolve(blob1)))
                .mimeType("text/plain")
                .checksumSha256(AuditService.computeSha256("CONFIDENTIAL FINANCIAL REPORT - Q3 PAYROLL AND BALANCE SHEET\nPrepared for Board of Directors only."))
                .owner(owner)
                .deleted(false)
                .build());

        Document doc2 = documentRepository.save(Document.builder()
                .title("Vendor Master Services Agreement - Apex")
                .description("Executed agreement detailing confidential terms of engagement, pricing, and liabilities.")
                .category("Contracts")
                .originalFilename("MSA_ApexConsulting.txt")
                .storageFilename(blob2)
                .fileSize((long) Files.size(vaultDir.resolve(blob2)))
                .mimeType("text/plain")
                .checksumSha256(AuditService.computeSha256("MASTER SERVICES AGREEMENT\nBetween TrustVault Corp and Apex Consulting LLC.\nClause 1: Confidentiality non-disclosure..."))
                .owner(owner)
                .deleted(false)
                .build());

        auditService.logEvent(
                owner.getId(),
                owner.getEmail(),
                owner.getRole().name(),
                "DOCUMENT_UPLOAD",
                doc1.getId(),
                doc1.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Uploaded seed document: Q3 Financial Statements & Executive Payroll"
        );

        auditService.logEvent(
                owner.getId(),
                owner.getEmail(),
                owner.getRole().name(),
                "DOCUMENT_UPLOAD",
                doc2.getId(),
                doc2.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Uploaded seed document: Vendor Master Services Agreement - Apex"
        );

        // 3. Seed Permissions
        permissionRepository.save(DocumentPermission.builder()
                .document(doc1)
                .user(auditor)
                .permissionLevel(PermissionLevel.READ)
                .grantedBy(owner)
                .isActive(true)
                .build());

        auditService.logEvent(
                owner.getId(),
                owner.getEmail(),
                owner.getRole().name(),
                "PERMISSION_GRANT",
                doc1.getId(),
                doc1.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Granted READ permission to Carol Auditor (auditor@trustvault.local)"
        );

        permissionRepository.save(DocumentPermission.builder()
                .document(doc2)
                .user(viewer)
                .permissionLevel(PermissionLevel.READ)
                .grantedBy(owner)
                .isActive(true)
                .build());

        auditService.logEvent(
                owner.getId(),
                owner.getEmail(),
                owner.getRole().name(),
                "PERMISSION_GRANT",
                doc2.getId(),
                doc2.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Granted READ permission to Bob Viewer (viewer@trustvault.local)"
        );

        // Seed a sample denied attempt by unauthorized user Eve for demonstration of audit tracking
        auditService.logEvent(
                unauthorized.getId(),
                unauthorized.getEmail(),
                unauthorized.getRole().name(),
                "ACCESS_REFUSED",
                doc1.getId(),
                doc1.getTitle(),
                "DENIED",
                "192.168.1.105",
                "User attempted unauthorized READ access to document without grant"
        );

        log.info("TrustVault demo data seeded successfully with cryptographic audit chain!");
    }
}
