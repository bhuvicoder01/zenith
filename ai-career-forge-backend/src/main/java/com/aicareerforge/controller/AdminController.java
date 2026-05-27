package com.aicareerforge.controller;

import com.aicareerforge.model.SystemConfig;
import com.aicareerforge.model.User;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.repository.JobRepository;
import com.aicareerforge.repository.SystemConfigRepository;
import com.aicareerforge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final com.aicareerforge.security.WebSocketNotificationHandler webSocketNotificationHandler;

    @GetMapping("/config")
    public ResponseEntity<SystemConfig> getConfig() {
        return ResponseEntity.ok(systemConfigRepository.findAll().stream().findFirst()
                .orElse(SystemConfig.builder().build()));
    }

    @PostMapping("/config")
    public ResponseEntity<SystemConfig> updateConfig(@RequestBody SystemConfig config) {
        SystemConfig existing = systemConfigRepository.findAll().stream().findFirst()
                .orElse(SystemConfig.builder().build());
        
        existing.setRegistrationOpen(config.isRegistrationOpen());
        existing.setMaintenanceMode(config.isMaintenanceMode());
        existing.setDebugLogs(config.isDebugLogs());
        existing.setAiModel(config.getAiModel());
        
        return ResponseEntity.ok(systemConfigRepository.save(existing));
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        log.info("Admin fetching all users");
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable String userId, @RequestParam User.Role role) {
        log.info("Admin updating user {} to role {}", userId, role);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(role);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        log.info("Admin fetching system stats");
        Map<String, Object> stats = new HashMap<>();
        
        long totalUsers = userRepository.count();
        long totalJobs = jobRepository.count();
        long totalApplications = applicationRepository.count();
        
        stats.put("totalUsers", totalUsers);
        stats.put("totalJobs", totalJobs);
        stats.put("totalApplications", totalApplications);
        
        // Count users by role
        Map<String, Long> roleDistribution = new HashMap<>();
        for (User.Role role : User.Role.values()) {
            roleDistribution.put(role.name(), userRepository.findAll().stream().filter(u -> u.getRole() == role).count());
        }
        stats.put("roleDistribution", roleDistribution);
        
        // System health (mocked)
        stats.put("cpuUsage", 42);
        stats.put("memoryUsage", 65);
        stats.put("status", "HEALTHY");
        
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/broadcast")
    public ResponseEntity<Void> broadcastNews(@RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "System Update");
        String message = body.getOrDefault("message", "");
        webSocketNotificationHandler.broadcastNotification("NEWS", title, message, null);
        return ResponseEntity.ok().build();
    }
}
