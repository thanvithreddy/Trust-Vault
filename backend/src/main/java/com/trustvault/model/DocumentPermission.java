package com.trustvault.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_permissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"document_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PermissionLevel permissionLevel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "granted_by_id", nullable = false)
    private User grantedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant grantedAt;

    @Column
    private Instant revokedAt;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;
}
