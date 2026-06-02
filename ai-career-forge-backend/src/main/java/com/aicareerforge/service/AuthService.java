package com.aicareerforge.service;

import com.aicareerforge.dto.AuthDtos.AuthRequest;
import com.aicareerforge.dto.AuthDtos.AuthResponse;
import com.aicareerforge.dto.AuthDtos.RegisterRequest;
import com.aicareerforge.model.User;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.model.PasswordResetToken;
import com.aicareerforge.repository.PasswordResetTokenRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserProfileService userProfileService;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private List<String> frontendUrls;

    private String getPrimaryFrontendUrl() {
        return frontendUrls.stream()
                .map(String::trim)
                .findFirst()
                .orElse("http://localhost:3000");
    }

    public void forgotPassword(String email) {
        var user = repository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No user found with this email"));

        // Delete any existing tokens for this email
        tokenRepository.deleteByEmail(email);

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .email(email)
                .token(token)
                .expiryDate(LocalDateTime.now().plusHours(1))
                .build();
        tokenRepository.save(resetToken);

        // We use the configured primary frontend URL
        String resetLink = getPrimaryFrontendUrl() + "/auth/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(email, resetLink);
    }

    public void resetPassword(String token, String newPassword) {
        var resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (resetToken.isExpired()) {
            tokenRepository.delete(resetToken);
            throw new RuntimeException("Invalid or expired token");
        }

        var user = repository.findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        repository.save(user);
        
        // Clean up the token after use
        tokenRepository.delete(resetToken);
    }

    public AuthResponse register(RegisterRequest request) {
        if (repository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        String baseUsername = "";
        if (request.getName() != null && !request.getName().isBlank()) {
            baseUsername = request.getName().toLowerCase().replaceAll("[^a-z0-9_]", "_");
        } else if (request.getEmail() != null && !request.getEmail().isBlank()) {
            baseUsername = request.getEmail().split("@")[0].toLowerCase().replaceAll("[^a-z0-9_]", "_");
        }
        if (baseUsername.isBlank()) {
            baseUsername = "user";
        }
        
        String uniqueUsername = baseUsername;
        int count = 1;
        while (repository.existsByUsername(uniqueUsername) || userProfileRepository.existsByUsername(uniqueUsername)) {
            uniqueUsername = baseUsername + count;
            count++;
        }

        var user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .username(uniqueUsername)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : User.Role.USER)
                .build();
        repository.save(user);

        // Initialize empty profile
        var profile = UserProfile.builder()
                .userId(user.getId())
                .username(uniqueUsername)
                .build();
        userProfileRepository.save(profile);

        var jwtToken = jwtService.generateToken(user);
        
        return AuthResponse.builder()
                .token(jwtToken)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .needsOnboarding(user.getRole() == User.Role.USER) // Only standard users need onboarding for now
                .build();
    }

    public AuthResponse authenticate(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        var user = repository.findByEmail(request.getEmail())
                .orElseThrow();
        var jwtToken = jwtService.generateToken(user);
        
        // Check if the user has completed onboarding
        boolean onboardingNeeded = userProfileService.needsOnboarding(user.getId());
        
        return AuthResponse.builder()
                .token(jwtToken)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .needsOnboarding(onboardingNeeded)
                .build();
    }

    public void changePassword(String userId, String oldPassword, String newPassword) {
        var user = repository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Invalid current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        repository.save(user);
    }
    public AuthResponse getCurrentUser(User user) {
        boolean onboardingNeeded = userProfileService.needsOnboarding(user.getId());
        return AuthResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .needsOnboarding(onboardingNeeded)
                .build();
    }
    public AuthResponse updateRole(String userId, String roleStr) {
        var user = repository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != User.Role.PENDING) {
            throw new RuntimeException("Role already selected");
        }

        try {
            User.Role role = User.Role.valueOf(roleStr.toUpperCase());
            if (role != User.Role.USER && role != User.Role.RECRUITER) {
                throw new RuntimeException("Invalid role selection");
            }
            user.setRole(role);
            repository.save(user);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role format");
        }

        return getCurrentUser(user);
    }
}
