package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.service.JobService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private static final Set<Integer> ALLOWED_PAGE_SIZES = Set.of(30, 40, 50, 75, 100);

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/search")
    public ResponseEntity<PagedResponse<JobResponse>> searchJobs(
            @RequestParam String query,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        int validSize = ALLOWED_PAGE_SIZES.contains(size) ? size : 30;
        return ResponseEntity.ok(jobService.searchJobs(query, location, source, page, validSize));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJob(@PathVariable String id) {
        return ResponseEntity.ok(jobService.getJob(id));
    }
}
