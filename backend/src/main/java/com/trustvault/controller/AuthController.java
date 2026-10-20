package com.trustvault.controller;

import com.trustvault.audit.AuditService;
import com.trustvault.dto.DTOs.AuthResponse;
import com.trustvault.dto.DTOs.LoginRequest;
import com.trustvault.dto.DTOs.RegisterRequest;
import com.trustvault.model.User;
import com.trustvault.repository.UserRepository;
import com.trustvault.security.JwtUtils;
import com.trustvault.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuditService auditService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.email(), loginRequest.password())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            UserPrincipal userDetails = (UserPrincipal) authentication.getPrincipal();
            String role = userDetails.getAuthorities().iterator().next().getAuthority();

            auditService.logEvent(
                    userDetails.getId(),
                    userDetails.getEmail(),
                    role,
                    "USER_LOGIN",
                    null,
                    null,
                    "SUCCESS",
                    clientIp,
                    "User logged in successfully"
            );

            return ResponseEntity.ok(AuthResponse.builder()
                    .token(jwt)
                    .type("Bearer")
                    .id(userDetails.getId())
                    .email(userDetails.getEmail())
                    .fullName(userDetails.getFullName())
                    .role(role)
                    .build());
        } catch (Exception e) {
            auditService.logEvent(
                    null,
                    loginRequest.email(),
                    "UNKNOWN",
                    "USER_LOGIN_FAILED",
                    null,
                    null,
                    "DENIED",
                    clientIp,
                    "Invalid password or email: " + e.getMessage()
            );
            throw e;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest, HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();

        if (userRepository.existsByEmail(registerRequest.email())) {
            return ResponseEntity.badRequest().body("Error: Email is already registered!");
        }

        User user = User.builder()
                .email(registerRequest.email())
                .password(passwordEncoder.encode(registerRequest.password()))
                .fullName(registerRequest.fullName())
                .role(registerRequest.role())
                .build();

        user = userRepository.save(user);

        auditService.logEvent(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                "USER_REGISTER",
                null,
                null,
                "SUCCESS",
                clientIp,
                "New account registered with role: " + user.getRole().name()
        );

        return ResponseEntity.ok("User registered successfully!");
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        return ResponseEntity.ok(AuthResponse.builder()
                .id(principal.getId())
                .email(principal.getEmail())
                .fullName(principal.getFullName())
                .role(principal.getAuthorities().iterator().next().getAuthority())
                .build());
    }
}
