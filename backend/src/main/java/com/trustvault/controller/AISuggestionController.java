package com.trustvault.controller;

import com.trustvault.dto.DTOs.AISuggestionResponse;
import com.trustvault.dto.DTOs.ConfirmAISuggestionRequest;
import com.trustvault.dto.DTOs.PermissionResponse;
import com.trustvault.model.User;
import com.trustvault.repository.UserRepository;
import com.trustvault.security.UserPrincipal;
import com.trustvault.service.AISuggestionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AISuggestionController {

    private final AISuggestionService aiSuggestionService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/documents/{documentId}/suggestions")
    public ResponseEntity<List<AISuggestionResponse>> getSuggestions(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(aiSuggestionService.getSuggestions(documentId, user, request.getRemoteAddr()));
    }

    @PostMapping("/documents/confirm")
    public ResponseEntity<?> confirmSuggestion(
            @Valid @RequestBody ConfirmAISuggestionRequest confirmRequest,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        User user = getAuthenticatedUser(principal);
        PermissionResponse response = aiSuggestionService.confirmSuggestion(confirmRequest, user, request.getRemoteAddr());
        if (response == null) {
            return ResponseEntity.ok("AI suggestion rejected by owner");
        }
        return ResponseEntity.ok(response);
    }
}
