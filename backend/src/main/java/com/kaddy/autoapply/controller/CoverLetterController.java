package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.request.CoverLetterRequest;
import com.kaddy.autoapply.dto.response.CoverLetterResponse;
import com.kaddy.autoapply.service.CoverLetterService;
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

import java.util.Map;

@RestController
@RequestMapping("/api/cover-letters")
public class CoverLetterController {

    private final CoverLetterService coverLetterService;

    public CoverLetterController(CoverLetterService coverLetterService) {
        this.coverLetterService = coverLetterService;
    }

    @PostMapping("/generate")
    public ResponseEntity<CoverLetterResponse> generate(Authentication auth,
                                                         @Valid @RequestBody CoverLetterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(coverLetterService.generate((String) auth.getPrincipal(), request));
    }

    @GetMapping
    public ResponseEntity<Page<CoverLetterResponse>> list(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                coverLetterService.getUserCoverLetters((String) auth.getPrincipal(), page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CoverLetterResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(coverLetterService.getCoverLetter(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CoverLetterResponse> update(@PathVariable String id,
                                                       @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(coverLetterService.update(id, body.get("content")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        coverLetterService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
