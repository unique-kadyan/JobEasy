package com.kaddy.autoapply.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    private static final long START_TIME = System.currentTimeMillis();

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        return buildPingResponse();
    }

    @GetMapping("/api/ping")
    public ResponseEntity<Map<String, Object>> ping() {
        return buildPingResponse();
    }

    private ResponseEntity<Map<String, Object>> buildPingResponse() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "status",   "ok",
                        "ts",       Instant.now().toString(),
                        "uptimeMs", System.currentTimeMillis() - START_TIME
                ));
    }
}
