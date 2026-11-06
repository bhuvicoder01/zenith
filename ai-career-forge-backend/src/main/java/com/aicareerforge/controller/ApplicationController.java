package com.aicareerforge.controller;

import com.aicareerforge.model.Application;
import com.aicareerforge.model.User;
import com.aicareerforge.service.ApplicationTrackerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationTrackerService applicationTrackerService;

    @GetMapping
    public ResponseEntity<List<Application>> getUserApplications(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(applicationTrackerService.getUserApplications(user.getId()));
    }

    @GetMapping("/{applicationId}")
    public ResponseEntity<Application> getApplication(@AuthenticationPrincipal User user, @PathVariable String applicationId) {
        return ResponseEntity.ok(applicationTrackerService.getApplication(applicationId, user.getId()));
    }

    @PostMapping
    public ResponseEntity<Application> createApplication(@AuthenticationPrincipal User user, @RequestBody Application application) {
        return ResponseEntity.ok(applicationTrackerService.createApplication(user.getId(), application));
    }

    record PrepRequest(String jobDescription, String company) {}

    @PostMapping("/{applicationId}/prepare")
    public ResponseEntity<Application> prepareApplicationMaterials(
            @AuthenticationPrincipal User user,
            @PathVariable String applicationId,
            @RequestBody(required = false) PrepRequest req) {
        
        String desc = req != null ? req.jobDescription() : null;
        String comp = req != null ? req.company() : null;
        
        return ResponseEntity.ok(applicationTrackerService.prepareApplicationMaterials(
                applicationId, 
                user.getId(),
                desc, 
                comp
        ));
    }

    @PatchMapping("/{applicationId}/status")
    public ResponseEntity<Application> updateStatus(
            @AuthenticationPrincipal User user,
            @PathVariable String applicationId,
            @RequestParam Application.Status status) {
        return ResponseEntity.ok(applicationTrackerService.updateStatus(applicationId, status, user.getId()));
    }

    @DeleteMapping("/{applicationId}")
    public ResponseEntity<Void> deleteApplication(
            @AuthenticationPrincipal User user,
            @PathVariable String applicationId) {
        applicationTrackerService.deleteApplication(applicationId, user.getId());
        return ResponseEntity.noContent().build();
    }
}
