package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.model.MockInterviewSession;
import com.kaddy.autoapply.service.InterviewPrepService;
import org.springframework.data.domain.Page;
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

@RestController
@RequestMapping("/api/interview-prep")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class InterviewPrepController {

    private final InterviewPrepService interviewPrepService;

    public InterviewPrepController(InterviewPrepService interviewPrepService) {
        this.interviewPrepService = interviewPrepService;
    }

    /** Start a new mock interview session — returns questions immediately */
    @PostMapping("/sessions")
    public ResponseEntity<MockInterviewSession> startSession(
            @RequestBody InterviewPrepService.StartRequest request,
            Authentication auth) {
        return ResponseEntity.ok(
                interviewPrepService.startSession((String) auth.getPrincipal(), request));
    }

    /** Submit answers for evaluation — returns completed session with scores */
    @PostMapping("/sessions/{sessionId}/submit")
    public ResponseEntity<MockInterviewSession> submitAnswers(
            @PathVariable String sessionId,
            @RequestBody InterviewPrepService.SubmitRequest request,
            Authentication auth) {
        return ResponseEntity.ok(
                interviewPrepService.submitAnswers((String) auth.getPrincipal(), sessionId, request));
    }

    /** List past interview sessions (paginated) */
    @GetMapping("/sessions")
    public ResponseEntity<PagedResponse<MockInterviewSession>> getSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        Page<MockInterviewSession> p = interviewPrepService.getSessions(
                (String) auth.getPrincipal(), page, size);
        return ResponseEntity.ok(new PagedResponse<>(
                p.getContent(), p.getTotalElements(), p.getTotalPages(),
                p.getNumber(), p.getSize()));
    }

    /** Get a single session by ID */
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<MockInterviewSession> getSession(
            @PathVariable String sessionId,
            Authentication auth) {
        return ResponseEntity.ok(
                interviewPrepService.getSession((String) auth.getPrincipal(), sessionId));
    }
}
