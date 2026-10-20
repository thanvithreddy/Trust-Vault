package com.trustvault.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private Instant timestamp;

    @Column
    private UUID userId;

    @Column
    private String userEmail;

    @Column
    private String userRole;

    @Column(nullable = false, updatable = false)
    private String action;

    @Column
    private UUID documentId;

    @Column
    private String documentTitle;

    @Column(nullable = false, updatable = false)
    private String status; // SUCCESS, DENIED, ERROR

    @Column
    private String ipAddress;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false, updatable = false)
    private String previousHash;

    @Column(nullable = false, updatable = false)
    private String currentHash;
}
