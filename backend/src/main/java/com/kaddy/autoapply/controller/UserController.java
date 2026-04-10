package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.request.AutoSearchScheduleRequest;
import com.kaddy.autoapply.dto.request.ProfileUpdateRequest;
import com.kaddy.autoapply.dto.response.AutoSearchScheduleResponse;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(Authentication auth) {
        return ResponseEntity.ok(userService.getProfile((String) auth.getPrincipal()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(Authentication auth,
                                                       @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile((String) auth.getPrincipal(), request));
    }

    @PostMapping("/github-import")
    public ResponseEntity<UserResponse> importFromGitHub(Authentication auth,
                                                          @RequestBody Map<String, String> body) {
        String username = body.get("username");
        if (username == null || username.isBlank()) {
            throw new com.kaddy.autoapply.exception.BadRequestException("GitHub username is required");
        }
        return ResponseEntity.ok(
                userService.importFromGitHub((String) auth.getPrincipal(), username.strip()));
    }

    @PostMapping("/skip-keywords")
    public ResponseEntity<UserResponse> addSkipKeyword(Authentication auth,
                                                        @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                userService.addSkipKeyword((String) auth.getPrincipal(), body.getOrDefault("keyword", "")));
    }

    @DeleteMapping("/skip-keywords/{keyword}")
    public ResponseEntity<UserResponse> removeSkipKeyword(Authentication auth,
                                                           @PathVariable String keyword) {
        return ResponseEntity.ok(
                userService.removeSkipKeyword((String) auth.getPrincipal(), keyword));
    }

    @PostMapping("/not-interested-reasons")
    public ResponseEntity<UserResponse> addNotInterestedReason(Authentication auth,
                                                                @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                userService.addNotInterestedReason((String) auth.getPrincipal(),
                        body.getOrDefault("reason", "")));
    }

    @DeleteMapping("/not-interested-reasons/{reason}")
    public ResponseEntity<UserResponse> removeNotInterestedReason(Authentication auth,
                                                                   @PathVariable String reason) {
        return ResponseEntity.ok(
                userService.removeNotInterestedReason((String) auth.getPrincipal(), reason));
    }

    @GetMapping("/auto-search-schedule")
    public ResponseEntity<AutoSearchScheduleResponse> getSchedule(Authentication auth) {
        return ResponseEntity.ok(userService.getAutoSearchSchedule((String) auth.getPrincipal()));
    }

    @PutMapping("/auto-search-schedule")
    public ResponseEntity<AutoSearchScheduleResponse> updateSchedule(
            Authentication auth,
            @Valid @RequestBody AutoSearchScheduleRequest request) {
        return ResponseEntity.ok(
                userService.updateAutoSearchSchedule((String) auth.getPrincipal(), request));
    }

    @PostMapping("/onboarding/complete")
    public ResponseEntity<UserResponse> completeOnboarding(Authentication auth) {
        return ResponseEntity.ok(userService.completeOnboarding((String) auth.getPrincipal()));
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication auth) {
        userService.deleteAccount((String) auth.getPrincipal());
        return ResponseEntity.noContent().build();
    }
}
