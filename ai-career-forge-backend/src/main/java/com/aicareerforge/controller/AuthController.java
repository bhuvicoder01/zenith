package com.aicareerforge.controller;

import com.aicareerforge.dto.AuthDtos.AuthRequest;
import com.aicareerforge.dto.AuthDtos.AuthResponse;
import com.aicareerforge.dto.AuthDtos.RegisterRequest;
import com.aicareerforge.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/authenticate")
    public ResponseEntity<AuthResponse> authenticate(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.authenticate(request));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@org.springframework.security.core.annotation.AuthenticationPrincipal com.aicareerforge.model.User user, @RequestBody java.util.Map<String, String> request) {
        authService.changePassword(user.getId(), request.get("oldPassword"), request.get("newPassword"));
        return ResponseEntity.ok().build();
    }
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(@org.springframework.security.core.annotation.AuthenticationPrincipal com.aicareerforge.model.User user) {
        return ResponseEntity.ok(authService.getCurrentUser(user));
    }
    @PostMapping("/set-role")
    public ResponseEntity<AuthResponse> setRole(@org.springframework.security.core.annotation.AuthenticationPrincipal com.aicareerforge.model.User user, @RequestBody java.util.Map<String, String> request) {
        return ResponseEntity.ok(authService.updateRole(user.getId(), request.get("role")));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody java.util.Map<String, String> request) {
        authService.forgotPassword(request.get("email"));
        return ResponseEntity.ok("Recovery protocol initiated. Check your email.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody java.util.Map<String, String> request) {
        authService.resetPassword(request.get("token"), request.get("newPassword"));
        return ResponseEntity.ok("Neural access restored. Password updated.");
    }
}
