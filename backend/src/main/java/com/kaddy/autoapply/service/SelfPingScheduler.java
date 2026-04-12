package com.kaddy.autoapply.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.annotation.PostConstruct;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

@Component
public class SelfPingScheduler {

    private static final Logger log = LoggerFactory.getLogger(SelfPingScheduler.class);

    private static final long STARTUP_DELAY_MS = 8_000;

    private static final long PING_INTERVAL_MS = 45_000;

    private static final long RETRY_DELAY_S = 5;

    private static final int TIMEOUT_S = 10;

    private final WebClient webClient;
    private final List<PingTarget> targets = new ArrayList<>();
    private final ConcurrentHashMap<String, Integer> failures = new ConcurrentHashMap<>();

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
            targets.forEach(t -> log.info("[keep-alive] Will ping {} every {} s — {}", t.name(),
                    PING_INTERVAL_MS / 1000, t.url()));
        }
    }

    @Scheduled(initialDelay = STARTUP_DELAY_MS, fixedDelay = PING_INTERVAL_MS)
    public void ping() {
        for (PingTarget target : targets) {
            webClient.get()
                    .uri(target.url())
                    .retrieve()
                    .toBodilessEntity() // discards body immediately — avoids IllegalStateException when timeout cancels
                                        // a partially-received response
                    .timeout(Duration.ofSeconds(TIMEOUT_S))

                    .retryWhen(Retry.fixedDelay(1, Duration.ofSeconds(RETRY_DELAY_S))
                            .filter(err -> true))
                    .onErrorResume(err -> {
                        int n = failures.merge(target.name(), 1, Integer::sum);

                        if (n == 1 || n % 5 == 0) {
                            log.warn("[keep-alive] {} unreachable after retry (consecutive: {}) — {}",
                                    target.name(), n, err.getMessage());
                        }
                        return Mono.empty();
                    })
                    .subscribe(ignored -> {
                        failures.put(target.name(), 0);
                        log.trace("[keep-alive] {} OK", target.name());
                    }, err -> {
                    }); // onError already handled by onErrorResume; this prevents unhandled-error noise
        }
    }

    private record PingTarget(String name, String url) {
    }
}
