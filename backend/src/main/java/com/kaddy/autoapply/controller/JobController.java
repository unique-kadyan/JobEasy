package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.service.JobService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/jobs")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class JobController {

    private static final Set<Integer> ALLOWED_PAGE_SIZES = Set.of(30, 40, 50, 75, 100);

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    /**
     * GET /api/jobs/search
     * When called by an authenticated user, results are scored and skip-filtered.
     * Authentication is optional — unauthenticated callers receive unscored results.
     */
    @GetMapping("/search")
    public ResponseEntity<PagedResponse<JobResponse>> searchJobs(
            Authentication auth,
            @RequestParam String query,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        int validSize = ALLOWED_PAGE_SIZES.contains(size) ? size : 30;
        String userId = (auth != null) ? (String) auth.getPrincipal() : null;
        return ResponseEntity.ok(jobService.searchJobs(query, location, source, page, validSize, userId));
    }

    /**
     * GET /api/jobs/counts?query=...&location=...
     * Returns a map of source → job count for badge display on tab headers.
     */
    @GetMapping("/counts")
    public ResponseEntity<Map<String, Long>> getSourceCounts(
            @RequestParam String query,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(jobService.getSourceCounts(query, location));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJob(@PathVariable String id) {
        return ResponseEntity.ok(jobService.getJob(id));
    }
}
