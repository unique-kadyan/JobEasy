package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Scrapes remote tech jobs from Himalayas' free public API (no key required).
 * Docs: https://himalayas.app/jobs/api
 */
@Component
public non-sealed class HimalayasScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(HimalayasScraper.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;

    public HimalayasScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://himalayas.app")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
    }

    @Override
    public String getSource() { return "HIMALAYAS"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        try {
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/jobs/api")
                            .queryParam("q", query)
                            .queryParam("limit", 50)
                            .queryParam("offset", page * 50)
                            .build())
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("jobs")) return List.of();

            List<Map<String, Object>> jobs = (List<Map<String, Object>>) response.get("jobs");
            List<JobResponse> results = new ArrayList<>();

            for (Map<String, Object> item : jobs) {
                List<String> tags = item.get("tags") instanceof List<?> t
                        ? t.stream().map(Object::toString).toList()
                        : List.of();

                // Location: remote or specific country
                Object locObj = item.get("location");
                String loc = "Remote";
                if (locObj instanceof List<?> locs && !locs.isEmpty()) {
                    loc = locs.getFirst().toString();
                } else if (locObj instanceof String s && !s.isBlank()) {
                    loc = s;
                }

                results.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable(item.get("uuid")).map(Object::toString).orElse(""),
                        "HIMALAYAS",
                        (String) item.getOrDefault("title", ""),
                        Optional.ofNullable(item.get("company"))
                                .filter(Map.class::isInstance).map(c -> ((Map<?, ?>) c).get("name"))
                                .map(Object::toString).orElse(""),
                        loc,
                        (String) item.getOrDefault("applicationLink", ""),
                        (String) item.getOrDefault("description", ""),
                        null,
                        tags,
                        (String) item.getOrDefault("jobType", "Full-Time"),
                        LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("Himalayas scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
