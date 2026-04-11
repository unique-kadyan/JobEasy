package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Disabled by default — returns 403 Forbidden (bot detection).
// To re-enable: set app.scraper.remoteok.enabled=true in application.properties
@Component
public non-sealed class RemoteOKScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(RemoteOKScraper.class);
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_TYPE =
            new ParameterizedTypeReference<>() {};

    @Value("${app.scraper.remoteok.enabled:false}")
    private boolean enabled;

    private final WebClient webClient;

    public RemoteOKScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://remoteok.com")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
    }

    @Override
    public String getSource() { return "REMOTEOK"; }

    @Override
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (!enabled) return List.of();
        try {
            List<Map<String, Object>> raw = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api")
                            .queryParam("tags", query.replace(" ", ",").toLowerCase())
                            .build())
                    .retrieve()
                    .bodyToMono(LIST_TYPE)
                    .block();

            if (raw == null || raw.isEmpty()) return List.of();

            List<JobResponse> results = new ArrayList<>();
            for (Map<String, Object> item : raw) {

                if (item.get("id") == null || item.get("position") == null) continue;

                String id = String.valueOf(item.get("id"));
                String title = (String) item.getOrDefault("position", "");
                String company = (String) item.getOrDefault("company", "");
                String url = (String) item.getOrDefault("url", "");
                String description = (String) item.getOrDefault("description", "");

                List<String> tags = item.get("tags") instanceof List<?> t
                        ? t.stream().map(Object::toString).toList()
                        : List.of();

                results.add(JobResponse.unscored(
                        null, id, "REMOTEOK",
                        title, company, "Remote",
                        url, description, null,
                        tags, "Full-Time", LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("RemoteOK scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
