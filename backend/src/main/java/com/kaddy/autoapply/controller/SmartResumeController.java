package com.kaddy.autoapply.controller;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.response.GeneratedResumeResponse;
import com.kaddy.autoapply.dto.response.ResumeAnalysisResponse;
import com.kaddy.autoapply.service.ResumeAnalysisService;
import com.kaddy.autoapply.service.ResumeGeneratorService;

@RestController
@RequestMapping("/api/smart-resume")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class SmartResumeController {

    private static final Logger log = LoggerFactory.getLogger(SmartResumeController.class);

    private final ResumeAnalysisService analysisService;
    private final ResumeGeneratorService generatorService;
    private final ObjectMapper objectMapper;

    public SmartResumeController(ResumeAnalysisService analysisService,
            ResumeGeneratorService generatorService,
            ObjectMapper objectMapper) {
        this.analysisService = analysisService;
        this.generatorService = generatorService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/analyze")
    public ResponseEntity<ResumeAnalysisResponse> analyze(Authentication auth) {
        return ResponseEntity.ok(analysisService.analyze((String) auth.getPrincipal()));
    }

    @PostMapping("/generate")
    public ResponseEntity<GeneratedResumeResponse> generate(Authentication auth) {
        return ResponseEntity.ok(generatorService.generate((String) auth.getPrincipal()));
    }

    @PostMapping(value = "/generate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generateStream(Authentication auth) {
        // 100-second emitter timeout — slightly more than MAX_GENERATION_TIME (90s)
        SseEmitter emitter = new SseEmitter(100_000L);
        String userId = (String) auth.getPrincipal();
        AtomicBoolean done = new AtomicBoolean(false);

        // Keepalive: send a comment ping every 20s so Render.com's nginx
        // proxy_read_timeout (60s default) never fires between progress events.
        Thread.startVirtualThread(() -> {
            try {
                while (!done.get()) {
                    Thread.sleep(20_000);
                    if (!done.get()) {
                        emitter.send(SseEmitter.event().comment("keepalive"));
                    }
                }
            } catch (Exception ignored) {
            }
        });

        // Generation runs on a separate virtual thread so this request thread is not
        // blocked.
        Thread.startVirtualThread(() -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("started")
                        .data("{\"message\":\"Starting resume generation...\"}"));

                GeneratedResumeResponse result = generatorService.generateWithProgress(
                        userId,
                        (eventType, jsonData) -> {
                            try {
                                emitter.send(SseEmitter.event().name(eventType).data(jsonData));
                            } catch (IOException e) {
                                log.warn("SSE send failed mid-generation for user {}: {}", userId, e.getMessage());
                                throw new RuntimeException(e);
                            }
                        });

                String completeJson = objectMapper.writeValueAsString(result);
                emitter.send(SseEmitter.event().name("complete").data(completeJson));
                emitter.complete();

            } catch (Exception e) {
                log.error("SSE generation failed for user {}: {}", userId, e.getMessage());
                try {
                    String msg = (e.getMessage() != null ? e.getMessage() : "Generation failed")
                            .replace("\"", "'");
                    emitter.send(SseEmitter.event().name("error")
                            .data("{\"message\":\"" + msg + "\"}"));
                } catch (IOException ignored) {
                }
                emitter.completeWithError(e);
            } finally {
                done.set(true);
            }
        });

        return emitter;
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
