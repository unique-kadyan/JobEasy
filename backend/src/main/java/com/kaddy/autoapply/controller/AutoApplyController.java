package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.model.AutoApplyJob;
import com.kaddy.autoapply.service.AutoApplyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auto-apply")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class AutoApplyController {

    private final AutoApplyService autoApplyService;

    public AutoApplyController(AutoApplyService autoApplyService) {
        this.autoApplyService = autoApplyService;
    }

    @PostMapping("/queue")
    public ResponseEntity<List<AutoApplyJob>> queueJobs(
            @RequestBody Map<String, List<String>> body,
            Authentication auth) {
        List<String> jobIds = body.get("jobIds");
        if (jobIds == null || jobIds.isEmpty())
            return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(
                autoApplyService.queueJobs((String) auth.getPrincipal(), jobIds));
    }

    @GetMapping("/queue")
    public ResponseEntity<List<AutoApplyJob>> getQueue(Authentication auth) {
        return ResponseEntity.ok(
                autoApplyService.getQueue((String) auth.getPrincipal()));
    }
}
