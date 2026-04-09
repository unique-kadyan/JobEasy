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

/**
 * Scrapes developer-focused jobs from FindWork's public API (no key required).
 * Docs: https://findwork.dev/api/jobs/
 */
@Component
public non-sealed class FindWorkScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(FindWorkScraper.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;

    public FindWorkScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://findwork.dev")
                .build();
    }

    @Override
    public String getSource() { return "FINDWORK"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        try {
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/jobs/")
                            .queryParam("search", query)
                            .queryParam("sort_by", "-date")
                            .build())
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("results")) return List.of();

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            List<JobResponse> jobs = new ArrayList<>();

            for (Map<String, Object> item : results) {
                List<String> keywords = item.get("keywords") instanceof List<?> k
                        ? k.stream().map(Object::toString).toList()
                        : List.of();

                Boolean remoteOk = (Boolean) item.getOrDefault("remote_ok", false);
                String loc = Boolean.TRUE.equals(remoteOk) ? "Remote"
                        : (String) item.getOrDefault("location", "");

                jobs.add(JobResponse.unscored(
                        null,
                        String.valueOf(item.getOrDefault("id", "")),
                        "FINDWORK",
                        (String) item.getOrDefault("role", ""),
                        (String) item.getOrDefault("company_name", ""),
                        loc,
                        (String) item.getOrDefault("url", ""),
                        "", // FindWork descriptions require a detail request
                        null,
                        keywords,
                        (String) item.getOrDefault("employment_type", ""),
                        LocalDateTime.now()
                ));
            }
            return jobs;
        } catch (Exception e) {
            log.error("FindWork scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
