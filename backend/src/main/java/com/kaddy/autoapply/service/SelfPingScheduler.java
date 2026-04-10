package com.kaddy.autoapply.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Keeps both Render free-tier instances (backend + frontend) permanently awake.
 *
 * <h2>Why this works</h2>
 * Render suspends a free service after 15 minutes of no <em>incoming</em>
 * HTTP traffic at its edge router. Calling the service's own PUBLIC URL
 * routes the request through Render's infrastructure — Render counts it as
 * real traffic and resets the inactivity timer, keeping the container running
 * indefinitely.
 *
 * <h2>Cross-instance redundancy</h2>
 * Both this scheduler (backend) and instrumentation.ts (frontend) ping
 * <em>each other</em> on every cycle:
 * <ul>
 *   <li>Backend awake first → immediately pings frontend URL → frontend stays awake.</li>
 *   <li>Frontend awake first → its scheduler pings backend → backend stays awake.</li>
 *   <li>Once both are running, the 20-second cycle keeps them alive indefinitely.</li>
 * </ul>
 *
 * <h2>Failure resilience</h2>
 * Each ping uses Reactor's {@code retryWhen}: if the HTTP call fails, it
 * automatically retries once after 3 seconds before counting a failure.
 * This tolerates transient network blips without waiting the full 20-second
 * interval to try again.
 *
 * <h2>Env vars (Render injects automatically)</h2>
 * {@code RENDER_EXTERNAL_URL} — this service's own public URL.
 * {@code app.frontend-url}    — defined in application.yml, points to the UI.
 */
@Component
public class SelfPingScheduler {

    private static final Logger log = LoggerFactory.getLogger(SelfPingScheduler.class);

    // First ping fires 8 s after startup — under the 35-second freeze threshold,
    // giving the service 27 seconds of headroom before Render could suspend it.
    private static final long STARTUP_DELAY_MS = 8_000;
    // Ping every 20 s — well under Render's 15-minute threshold; lightweight enough
    // to run indefinitely without meaningful resource cost.
    private static final long PING_INTERVAL_MS = 20_000;
    // If a ping fails, retry once after 3 s before logging a warning.
    private static final long RETRY_DELAY_S    = 3;
    // End-to-end timeout per ping attempt.
    private static final int  TIMEOUT_S        = 8;

    private final WebClient                            webClient;
    private final List<PingTarget>                     targets   = new ArrayList<>();
    private final ConcurrentHashMap<String, Integer>   failures  = new ConcurrentHashMap<>();

    public SelfPingScheduler(
            WebClient.Builder webClientBuilder,
            @Value("${RENDER_EXTERNAL_URL:}") String renderExternalUrl,
            @Value("${app.frontend-url:}") String frontendUrl) {

        this.webClient = webClientBuilder.build();

        String backendBase = renderExternalUrl.isBlank()
                ? "http://localhost:8080"
                : renderExternalUrl;

        targets.add(new PingTarget("backend", backendBase + "/api/ping"));

        if (!frontendUrl.isBlank() && !frontendUrl.contains("localhost")) {
            targets.add(new PingTarget("frontend", frontendUrl + "/api/ping"));
        }
    }

    @PostConstruct
    void logStartup() {
        if (targets.size() == 1 && targets.get(0).url().contains("localhost")) {
            log.info("[keep-alive] Running locally — self-ping disabled (RENDER_EXTERNAL_URL not set)");
        } else {
            targets.forEach(t ->
                log.info("[keep-alive] Will ping {} every {} s — {}", t.name(), PING_INTERVAL_MS / 1000, t.url())
            );
        }
    }

    @Scheduled(initialDelay = STARTUP_DELAY_MS, fixedDelay = PING_INTERVAL_MS)
    public void ping() {
        for (PingTarget target : targets) {
            webClient.get()
                    .uri(target.url())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(TIMEOUT_S))
                    // Retry once after 3 s on any error before counting a failure.
                    .retryWhen(Retry.fixedDelay(1, Duration.ofSeconds(RETRY_DELAY_S))
                            .filter(err -> true))
                    .onErrorResume(err -> {
                        int n = failures.merge(target.name(), 1, Integer::sum);
                        // Log first failure and every 5th to avoid log spam.
                        if (n == 1 || n % 5 == 0) {
                            log.warn("[keep-alive] {} unreachable after retry (consecutive: {}) — {}",
                                    target.name(), n, err.getMessage());
                        }
                        return Mono.empty();
                    })
                    .subscribe(ignored -> {
                        failures.put(target.name(), 0);
                        log.trace("[keep-alive] {} OK", target.name());
                    });
        }
    }

    private record PingTarget(String name, String url) {}
}
