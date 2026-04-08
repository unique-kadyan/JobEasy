package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.response.GeneratedResumeResponse;
import com.kaddy.autoapply.dto.response.ResumeAnalysisResponse;
import com.kaddy.autoapply.service.ResumeAnalysisService;
import com.kaddy.autoapply.service.ResumeGeneratorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/smart-resume")
public class SmartResumeController {

    private final ResumeAnalysisService analysisService;
    private final ResumeGeneratorService generatorService;

    public SmartResumeController(ResumeAnalysisService analysisService,
                                  ResumeGeneratorService generatorService) {
        this.analysisService = analysisService;
        this.generatorService = generatorService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<ResumeAnalysisResponse> analyze(Authentication auth) {
        return ResponseEntity.ok(analysisService.analyze((String) auth.getPrincipal()));
    }

    @PostMapping("/generate")
    public ResponseEntity<GeneratedResumeResponse> generate(Authentication auth) {
        return ResponseEntity.ok(generatorService.generate((String) auth.getPrincipal()));
    }

    @GetMapping("/latest")
    public ResponseEntity<GeneratedResumeResponse> getLatest(Authentication auth) {
        return ResponseEntity.ok(generatorService.getLatest((String) auth.getPrincipal()));
    }

    @GetMapping("/{id}/full")
    public ResponseEntity<GeneratedResumeResponse> getFull(@PathVariable String id,
                                                            Authentication auth) {
        return ResponseEntity.ok(generatorService.getFull(id, (String) auth.getPrincipal()));
    }
}
