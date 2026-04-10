package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public non-sealed class JoobleApiClient implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(JoobleApiClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;

    public JoobleApiClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.scraper.jooble.api-key:}") String apiKey) {
        this.webClient = webClientBuilder
                .baseUrl("https://jooble.org")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
        this.apiKey = apiKey;
    }

    @Override
    public String getSource() { return "JOOBLE"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("Jooble API key not configured — skipping");
            return List.of();
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "keywords", query,
                    "location", Optional.ofNullable(location).orElse(""),
                    "page", page + 1,
                    "resultonpage", 20
            );

            Map<String, Object> response = webClient.post()
                    .uri("/api/" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("jobs")) return List.of();

            List<Map<String, Object>> jobs = (List<Map<String, Object>>) response.get("jobs");
            List<JobResponse> results = new ArrayList<>();

            for (Map<String, Object> item : jobs) {
                results.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable(item.get("id")).map(Object::toString).orElse(""),
                        "JOOBLE",
                        (String) item.getOrDefault("title", ""),
                        (String) item.getOrDefault("company", ""),
                        (String) item.getOrDefault("location", ""),
                        (String) item.getOrDefault("link", ""),
                        (String) item.getOrDefault("snippet", ""),
                        (String) item.getOrDefault("salary", null),
                        List.of(),
                        (String) item.getOrDefault("type", ""),
                        LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("Jooble API error: {}", e.getMessage());
            return List.of();
        }
    }
}
