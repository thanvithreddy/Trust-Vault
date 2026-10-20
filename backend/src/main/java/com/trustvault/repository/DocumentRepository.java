package com.trustvault.repository;

import com.trustvault.model.Document;
import com.trustvault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    Optional<Document> findByIdAndDeletedFalse(UUID id);

    @Query("SELECT DISTINCT d FROM Document d " +
           "LEFT JOIN DocumentPermission p ON p.document = d AND p.user = :user AND p.isActive = true " +
           "WHERE d.deleted = false AND (d.owner = :user OR p.id IS NOT NULL)")
    List<Document> findAllAccessibleByUser(@Param("user") User user);

    @Query("SELECT DISTINCT d FROM Document d " +
           "LEFT JOIN DocumentPermission p ON p.document = d AND p.user = :user AND p.isActive = true " +
           "WHERE d.deleted = false " +
           "AND (d.owner = :user OR p.id IS NOT NULL) " +
           "AND (:title IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :title, '%'))) " +
           "AND (:category IS NULL OR LOWER(d.category) = LOWER(:category)) " +
           "AND (:ownerEmail IS NULL OR LOWER(d.owner.email) LIKE LOWER(CONCAT('%', :ownerEmail, '%'))) " +
           "AND (:startDate IS NULL OR d.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR d.createdAt <= :endDate)")
    List<Document> searchAccessibleByUser(
            @Param("user") User user,
            @Param("title") String title,
            @Param("category") String category,
            @Param("ownerEmail") String ownerEmail,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    @Query("SELECT DISTINCT d.category FROM Document d WHERE d.deleted = false")
    List<String> findAllCategories();
}
