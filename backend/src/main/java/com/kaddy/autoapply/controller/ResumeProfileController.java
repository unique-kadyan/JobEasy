package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.model.ResumeProfile;
import com.kaddy.autoapply.service.ResumeProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/resume-profile")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeProfileController {

    private final ResumeProfileService service;

    public ResumeProfileController(ResumeProfileService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ResumeProfile> get(Authentication auth) {
        return ResponseEntity.ok(service.getOrCreate((String) auth.getPrincipal()));
    }

    @PatchMapping
    public ResponseEntity<ResumeProfile> patch(
            @RequestBody Map<String, Object> updates,
            Authentication auth) {
        return ResponseEntity.ok(service.patch((String) auth.getPrincipal(), updates));
    }
}
