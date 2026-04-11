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
import java.util.Optional;

// Disabled by default — returns 404 (API endpoint gone).
// To re-enable: set app.scraper.themuse.enabled=true in application.properties
@Component
public non-sealed class TheMuseScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(TheMuseScraper.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    @Value("${app.scraper.themuse.enabled:false}")
    private boolean enabled;

    private final WebClient webClient;

    public TheMuseScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://www.themuse.com")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
    }

    @Override
    public String getSource() { return "THE_MUSE"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (!enabled) return List.of();
        try {
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/public/v2/jobs")
                            .queryParam("descending", true)
                            .queryParam("page", page)
                            .queryParam("category", query)
                            .build())
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("results")) return List.of();

            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) response.get("results");
            List<JobResponse> jobs = new ArrayList<>();

            for (Map<String, Object> item : results) {

                String company = Optional.ofNullable(item.get("company"))
                        .filter(Map.class::isInstance)
                        .map(c -> ((Map<?, ?>) c).get("name"))
                        .map(Object::toString)
                        .orElse("");

                String loc = "Remote";
                Object locsObj = item.get("locations");
                if (locsObj instanceof List<?> locs && !locs.isEmpty()) {
                    Object first = locs.getFirst();
                    if (first instanceof Map<?, ?> m) {
                        loc = Optional.ofNullable(m.get("name")).map(Object::toString).orElse("Remote");
                    }
                }

                Object refs = item.get("refs");
                String url = "";
                if (refs instanceof Map<?, ?> refMap) {
                    url = Optional.ofNullable(refMap.get("landing_page"))
                            .map(Object::toString).orElse("");
                }

                jobs.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable(item.get("id")).map(Object::toString).orElse(""),
                        "THE_MUSE",
                        (String) item.getOrDefault("name", ""),
                        company,
                        loc,
                        url,
                        (String) item.getOrDefault("contents", ""),
                        null,
                        List.of(),
                        (String) item.getOrDefault("type", ""),
                        LocalDateTime.now()
                ));
            }
            return jobs;
        } catch (Exception e) {
            log.error("The Muse scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
