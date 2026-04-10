package com.kaddy.autoapply.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Public health endpoints — no auth required, no DB or Redis calls.
 *
 * GET /        — Root path. Render uses this for its own service health check.
 *               Must return 2xx or Render marks the service unhealthy and restarts it.
 * GET /api/ping — Keep-alive endpoint used by SelfPingScheduler, instrumentation.ts,
 *               GitHub Actions, and the browser's useKeepAlive hook.
 */
@RestController
public class HealthController {

    private static final long START_TIME = System.currentTimeMillis();

    /** Root path — keeps Render's own health check happy. */
    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        return buildPingResponse();
    }

    /** Primary keep-alive endpoint for all scheduler and browser pings. */
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
