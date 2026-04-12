package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.request.ApplyRequest;
import com.kaddy.autoapply.dto.request.InterviewDetailsRequest;
import com.kaddy.autoapply.dto.request.OfferDetailsRequest;
import com.kaddy.autoapply.dto.response.ApplicationResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
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
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
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
                        @Valid @RequestBody List<ApplyRequest> requests) {
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(applicationService.bulkApply((String) auth.getPrincipal(), requests));
        }

        @GetMapping
        public ResponseEntity<PagedResponse<ApplicationResponse>> list(
                        Authentication auth,
                        @RequestParam(required = false) String status,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                Page<ApplicationResponse> p = applicationService.getUserApplications(
                                (String) auth.getPrincipal(), status, page, size);
                return ResponseEntity.ok(new PagedResponse<>(
                                p.getContent(), p.getTotalElements(), p.getTotalPages(),
                                p.getNumber(), p.getSize()));
        }

        @PutMapping("/{id}/status")
        public ResponseEntity<ApplicationResponse> updateStatus(
                        Authentication auth,
                        @PathVariable String id,
                        @RequestBody Map<String, String> body) {
                String status = Optional.ofNullable(body.get("status"))
                                .map(String::trim)
                                .filter(s -> !s.isEmpty())
                                .orElseThrow(() -> new BadRequestException("status is required"));
                return ResponseEntity.ok(applicationService.updateStatus(id, (String) auth.getPrincipal(), status));
        }

        @PutMapping("/{id}/interview")
        public ResponseEntity<ApplicationResponse> updateInterview(
                        Authentication auth,
                        @PathVariable String id,
                        @Valid @RequestBody InterviewDetailsRequest request) {
                return ResponseEntity.ok(
                                applicationService.updateInterviewDetails(id, (String) auth.getPrincipal(), request));
        }

        @PutMapping("/{id}/offer")
        public ResponseEntity<ApplicationResponse> updateOffer(
                        Authentication auth,
                        @PathVariable String id,
                        @Valid @RequestBody OfferDetailsRequest request) {
                return ResponseEntity.ok(
                                applicationService.updateOfferDetails(id, (String) auth.getPrincipal(), request));
        }

        @DeleteMapping("/{id}")
        public ResponseEntity<Void> delete(Authentication auth, @PathVariable String id) {
                applicationService.delete(id, (String) auth.getPrincipal());
                return ResponseEntity.noContent().build();
        }
}
