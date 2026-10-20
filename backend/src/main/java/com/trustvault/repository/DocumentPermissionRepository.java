package com.trustvault.repository;

import com.trustvault.model.Document;
import com.trustvault.model.DocumentPermission;
import com.trustvault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, UUID> {

    Optional<DocumentPermission> findByDocumentAndUserAndIsActiveTrue(Document document, User user);

    Optional<DocumentPermission> findByDocumentIdAndUserIdAndIsActiveTrue(UUID documentId, UUID userId);

    Optional<DocumentPermission> findByDocumentAndUser(Document document, User user);

    List<DocumentPermission> findByDocumentIdAndIsActiveTrue(UUID documentId);

    List<DocumentPermission> findByDocumentId(UUID documentId);

    List<DocumentPermission> findByUserIdAndIsActiveTrue(UUID userId);
}
