package com.trustvault.controller;

import com.trustvault.dto.DTOs.DocumentResponse;
import com.trustvault.dto.DTOs.UpdateDocumentRequest;
import com.trustvault.model.User;
import com.trustvault.repository.UserRepository;
import com.trustvault.security.UserPrincipal;
import com.trustvault.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found in database"));
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> searchDocuments(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String ownerEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate
    ) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(documentService.searchDocuments(user, title, category, ownerEmail, startDate, endDate));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("category") String category,
            HttpServletRequest request
    ) throws IOException {
        User user = getAuthenticatedUser(principal);
        String clientIp = request.getRemoteAddr();
        return ResponseEntity.ok(documentService.uploadDocument(file, title, description, category, user, clientIp));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(documentService.getDocument(id, user, request.getRemoteAddr()));
    }

    @GetMapping("/{id}/stream")
    public ResponseEntity<Resource> streamDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        DocumentService.DownloadPayload payload = documentService.streamDocument(id, user, request.getRemoteAddr());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(payload.mimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.originalFilename() + "\"")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(payload.size()))
                .header("X-Content-Type-Options", "nosniff")
                .body(payload.resource());
    }

    @PutMapping("/{id}")
    public ResponseEntity<DocumentResponse> updateDocument(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDocumentRequest updateRequest,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(documentService.updateDocument(id, updateRequest, user, request.getRemoteAddr()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        documentService.deleteDocument(id, user, request.getRemoteAddr());
        return ResponseEntity.ok().body("Document deleted successfully");
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(documentService.getCategories());
    }
}
