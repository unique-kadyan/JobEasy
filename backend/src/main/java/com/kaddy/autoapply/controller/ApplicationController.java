package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.request.ApplyRequest;
import com.kaddy.autoapply.dto.response.ApplicationResponse;
import com.kaddy.autoapply.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.kaddy.autoapply.exception.BadRequestException;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    public ResponseEntity<ApplicationResponse> apply(Authentication auth,
                                                      @Valid @RequestBody ApplyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.apply((String) auth.getPrincipal(), request));
    }

    @PostMapping("/bulk-apply")
    public ResponseEntity<List<ApplicationResponse>> bulkApply(Authentication auth,
                                                                @RequestBody List<ApplyRequest> requests) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.bulkApply((String) auth.getPrincipal(), requests));
    }

    @GetMapping
    public ResponseEntity<Page<ApplicationResponse>> list(
            Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                applicationService.getUserApplications((String) auth.getPrincipal(), status, page, size));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApplicationResponse> updateStatus(@PathVariable String id,
                                                             @RequestBody Map<String, String> body) {
        String status = Optional.ofNullable(body.get("status"))
                .orElseThrow(() -> new BadRequestException("status is required"));
        return ResponseEntity.ok(applicationService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        applicationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
