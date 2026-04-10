package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.service.ResumeOptimizationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/resumes")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeOptimizationController {

    private final ResumeOptimizationService optimizationService;

    public ResumeOptimizationController(ResumeOptimizationService optimizationService) {
        this.optimizationService = optimizationService;
    }

    @PostMapping("/{id}/optimize")
    public ResponseEntity<ResumeOptimizationService.OptimizationResult> optimize(
            Authentication auth,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {

        String jobTitle    = body.get("jobTitle");
        String company     = body.get("company");
        String jd          = body.get("jobDescription");
        String preferredAi = body.get("preferredAi");

        if (jobTitle == null || jobTitle.isBlank()) {
            throw new BadRequestException("jobTitle is required");
        }
        if (jd == null || jd.isBlank()) {
            throw new BadRequestException("jobDescription is required");
        }

        return ResponseEntity.ok(
                optimizationService.optimize(
                        (String) auth.getPrincipal(), id, jobTitle, company, jd, preferredAi));
    }
}
