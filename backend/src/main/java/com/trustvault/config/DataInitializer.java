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
        String commonPassword = passwordEncoder.encode("Password123!");

        // Ensure vault physical directory exists
        Path vaultDir = Paths.get(storagePath).toAbsolutePath().normalize();
        Files.createDirectories(vaultDir);

        if (userRepository.count() > 0) {
            log.info("Database has existing users. Ensuring Indian persona identities and names are up to date...");
            ensureIndianPersonas(commonPassword, vaultDir);
            return;
        }

        log.info("Seeding initial TrustVault demonstration data with Indian executive personas...");

        // 1. Seed Users (Indian Personas)
        User admin = userRepository.save(User.builder()
                .email("admin@trustvault.local")
                .password(commonPassword)
                .fullName("Ananya Iyer (Chief Security Officer)")
                .role(Role.ROLE_ADMIN)
                .build());

        User thanvith = userRepository.save(User.builder()
                .email("thanvith@trustvault.local")
                .password(commonPassword)
                .fullName("Thanvith Reddy (CFO & Vault Owner)")
                .role(Role.ROLE_OWNER)
                .build());

        User owner = userRepository.save(User.builder()
                .email("owner@trustvault.local")
                .password(commonPassword)
                .fullName("Thanvith Reddy (CFO & Vault Owner)")
                .role(Role.ROLE_OWNER)
                .build());

        User tej = userRepository.save(User.builder()
                .email("tej@trustvault.local")
                .password(commonPassword)
                .fullName("Tej Sharma (Engineering Lead)")
                .role(Role.ROLE_VIEWER)
                .build());

        User viewer = userRepository.save(User.builder()
                .email("viewer@trustvault.local")
                .password(commonPassword)
                .fullName("Tej Sharma (Engineering Lead)")
                .role(Role.ROLE_VIEWER)
                .build());

        User vikram = userRepository.save(User.builder()
                .email("vikram@trustvault.local")
                .password(commonPassword)
                .fullName("Vikram Malhotra (Lead Statutory Auditor)")
                .role(Role.ROLE_VIEWER)
                .build());

        User auditor = userRepository.save(User.builder()
                .email("auditor@trustvault.local")
                .password(commonPassword)
                .fullName("Vikram Malhotra (Lead Statutory Auditor)")
                .role(Role.ROLE_VIEWER)
                .build());

        User priya = userRepository.save(User.builder()
                .email("priya@trustvault.local")
                .password(commonPassword)
                .fullName("Priya Patel (Former Contractor / Unauthorized)")
                .role(Role.ROLE_VIEWER)
                .build());

        User unauthorized = userRepository.save(User.builder()
                .email("unauthorized@trustvault.local")
                .password(commonPassword)
                .fullName("Priya Patel (Former Contractor / Unauthorized)")
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
                "Seeded administrative, owner (Thanvith), and viewer (Tej, Vikram, Priya) identities"
        );

        // 2. Seed Sample Files in Vault Storage
        String blob1 = UUID.randomUUID() + ".blob";
        String blob2 = UUID.randomUUID() + ".blob";

        Files.writeString(vaultDir.resolve(blob1), "CONFIDENTIAL FINANCIAL REPORT - FY26 EXECUTIVE PAYROLL & CAPITAL BUDGET\nPrepared for Board of Directors. Strict NDA enforced.");
        Files.writeString(vaultDir.resolve(blob2), "MASTER SERVICES AGREEMENT - TATA CONSULTANCY & TRUSTVAULT\nClause 1: Confidentiality non-disclosure, IP ownership, and SLA terms.");

        Document doc1 = documentRepository.save(Document.builder()
                .title("FY26 Executive Compensation & Payroll Statements")
                .description("Highly confidential executive compensation figures, quarterly bonus pools, and company balance sheet.")
                .category("Financials")
                .originalFilename("FY26_Payroll_Statements.txt")
                .storageFilename(blob1)
                .fileSize((long) Files.size(vaultDir.resolve(blob1)))
                .mimeType("text/plain")
                .checksumSha256(AuditService.computeSha256("CONFIDENTIAL FINANCIAL REPORT - FY26 EXECUTIVE PAYROLL & CAPITAL BUDGET\nPrepared for Board of Directors. Strict NDA enforced."))
                .owner(thanvith)
                .deleted(false)
                .build());

        Document doc2 = documentRepository.save(Document.builder()
                .title("Master Services Agreement - Tata Consultancy")
                .description("Executed agreement detailing confidential terms of engagement, pricing, SLAs, and liabilities.")
                .category("Contracts")
                .originalFilename("MSA_TataConsultancy.txt")
                .storageFilename(blob2)
                .fileSize((long) Files.size(vaultDir.resolve(blob2)))
                .mimeType("text/plain")
                .checksumSha256(AuditService.computeSha256("MASTER SERVICES AGREEMENT - TATA CONSULTANCY & TRUSTVAULT\nClause 1: Confidentiality non-disclosure, IP ownership, and SLA terms."))
                .owner(thanvith)
                .deleted(false)
                .build());

        auditService.logEvent(
                thanvith.getId(),
                thanvith.getEmail(),
                thanvith.getRole().name(),
                "DOCUMENT_UPLOAD",
                doc1.getId(),
                doc1.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Uploaded seed document: FY26 Executive Compensation & Payroll Statements"
        );

        auditService.logEvent(
                thanvith.getId(),
                thanvith.getEmail(),
                thanvith.getRole().name(),
                "DOCUMENT_UPLOAD",
                doc2.getId(),
                doc2.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Uploaded seed document: Master Services Agreement - Tata Consultancy"
        );

        // 3. Seed Permissions
        permissionRepository.save(DocumentPermission.builder()
                .document(doc1)
                .user(vikram)
                .permissionLevel(PermissionLevel.READ)
                .grantedBy(thanvith)
                .isActive(true)
                .build());

        auditService.logEvent(
                thanvith.getId(),
                thanvith.getEmail(),
                thanvith.getRole().name(),
                "PERMISSION_GRANT",
                doc1.getId(),
                doc1.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Granted READ permission to Vikram Malhotra (vikram@trustvault.local)"
        );

        permissionRepository.save(DocumentPermission.builder()
                .document(doc2)
                .user(tej)
                .permissionLevel(PermissionLevel.READ)
                .grantedBy(thanvith)
                .isActive(true)
                .build());

        auditService.logEvent(
                thanvith.getId(),
                thanvith.getEmail(),
                thanvith.getRole().name(),
                "PERMISSION_GRANT",
                doc2.getId(),
                doc2.getTitle(),
                "SUCCESS",
                "127.0.0.1",
                "Granted READ permission to Tej Sharma (tej@trustvault.local)"
        );

        // Seed sample denied attempts by unauthorized user Priya Patel
        auditService.logEvent(
                priya.getId(),
                priya.getEmail(),
                priya.getRole().name(),
                "ACCESS_REFUSED",
                doc1.getId(),
                doc1.getTitle(),
                "DENIED",
                "192.168.1.105",
                "User attempted unauthorized READ access to payroll document without active grant"
        );

        log.info("TrustVault demo data seeded successfully with Indian personas & cryptographic audit chain!");
    }

    private void ensureIndianPersonas(String password, Path vaultDir) {
        upsertUser("admin@trustvault.local", "Ananya Iyer (Chief Security Officer)", Role.ROLE_ADMIN, password);
        User thanvith = upsertUser("thanvith@trustvault.local", "Thanvith Reddy (CFO & Vault Owner)", Role.ROLE_OWNER, password);
        upsertUser("owner@trustvault.local", "Thanvith Reddy (CFO & Vault Owner)", Role.ROLE_OWNER, password);
        User tej = upsertUser("tej@trustvault.local", "Tej Sharma (Engineering Lead)", Role.ROLE_VIEWER, password);
        upsertUser("viewer@trustvault.local", "Tej Sharma (Engineering Lead)", Role.ROLE_VIEWER, password);
        User vikram = upsertUser("vikram@trustvault.local", "Vikram Malhotra (Lead Statutory Auditor)", Role.ROLE_VIEWER, password);
        upsertUser("auditor@trustvault.local", "Vikram Malhotra (Lead Statutory Auditor)", Role.ROLE_VIEWER, password);
        upsertUser("priya@trustvault.local", "Priya Patel (Former Contractor / Unauthorized)", Role.ROLE_VIEWER, password);
        upsertUser("unauthorized@trustvault.local", "Priya Patel (Former Contractor / Unauthorized)", Role.ROLE_VIEWER, password);

        // Update documents to ensure Thanvith owns them if needed
        for (Document d : documentRepository.findAll()) {
            if (d.getOwner().getEmail().equals("owner@trustvault.local") || d.getOwner().getEmail().equals("thanvith@trustvault.local")) {
                d.getOwner().setFullName("Thanvith Reddy (CFO & Vault Owner)");
                userRepository.save(d.getOwner());
            }
        }
        log.info("Verified all Indian personas: Thanvith, Tej, Vikram, Priya, Ananya are active.");
    }

    private User upsertUser(String email, String fullName, Role role, String password) {
        return userRepository.findByEmail(email).map(existing -> {
            existing.setFullName(fullName);
            return userRepository.save(existing);
        }).orElseGet(() -> userRepository.save(User.builder()
                .email(email)
                .fullName(fullName)
                .role(role)
                .password(password)
                .build()));
    }
}
