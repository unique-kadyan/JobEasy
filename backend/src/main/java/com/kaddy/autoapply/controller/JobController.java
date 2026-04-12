package com.kaddy.autoapply.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.service.JobService;

@RestController
@RequestMapping("/api/jobs")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class JobController {

    private static final Set<Integer> ALLOWED_PAGE_SIZES = Set.of(30, 40, 50, 75, 100);

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/search")
    public ResponseEntity<PagedResponse<JobResponse>> searchJobs(
            Authentication auth,
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) Long minSalary,
            @RequestParam(required = false) Long maxSalary,
            @RequestParam(defaultValue = "30") int maxAgeDays) {
        int validSize = ALLOWED_PAGE_SIZES.contains(size) ? size : 30;
        String userId = (auth != null) ? (String) auth.getPrincipal() : null;
        return ResponseEntity.ok(
                jobService.searchJobs(query, location, source, page, validSize,
                        userId, minSalary, maxSalary, maxAgeDays));
    }

    @GetMapping("/counts")
    public ResponseEntity<Map<String, Long>> getSourceCounts(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(jobService.getSourceCounts(query, location));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJob(@PathVariable String id) {
        return ResponseEntity.ok(jobService.getJob(id));
    }

    @PostMapping("/{id}/summarize")
    public ResponseEntity<JobResponse> summarize(Authentication auth, @PathVariable String id) {
        String userId = (auth != null) ? (String) auth.getPrincipal() : null;
        return ResponseEntity.ok(jobService.summarize(id, userId));
    }

    @GetMapping("/{id}/match")
    public ResponseEntity<JobResponse> matchJob(Authentication auth, @PathVariable String id) {
        String userId = (auth != null) ? (String) auth.getPrincipal() : null;
        return ResponseEntity.ok(jobService.matchJob(userId, id));
    }

    @PostMapping("/dismiss")
    public ResponseEntity<Map<String, Integer>> dismissJobs(
            Authentication auth,
            @RequestBody Map<String, List<String>> body) {
        String userId = (String) auth.getPrincipal();
        List<String> jobIds = body.getOrDefault("jobIds", List.of());
        int dismissed = jobService.dismissJobs(userId, jobIds);
        return ResponseEntity.ok(Map.of("dismissed", dismissed));
    }
}
