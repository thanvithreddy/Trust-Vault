package com.trustvault.repository;

import com.trustvault.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Optional<AuditLog> findTopByOrderByTimestampDescIdDesc();

    List<AuditLog> findAllByOrderByTimestampDesc();

    List<AuditLog> findAllByOrderByTimestampAscIdAsc();

    List<AuditLog> findByDocumentIdOrderByTimestampDesc(UUID documentId);

    List<AuditLog> findByUserIdOrderByTimestampDesc(UUID userId);

    List<AuditLog> findByStatusOrderByTimestampDesc(String status);
}
