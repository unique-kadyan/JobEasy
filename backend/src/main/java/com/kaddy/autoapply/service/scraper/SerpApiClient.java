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

/**
 * Scrapes jobs from Google Jobs via the SerpApi /search endpoint.
 * Docs: https://serpapi.com/google-jobs-api
 */
@Component
public class SerpApiClient implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(SerpApiClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;

    public SerpApiClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.scraper.serpapi.api-key:}") String apiKey) {
        this.webClient = webClientBuilder
                .baseUrl("https://serpapi.com")
                .build();
        this.apiKey = apiKey;
    }

    @Override
    public String getSource() {
        return "SERPAPI";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("SerpApi API key not configured");
            return List.of();
        }

        try {
            final String where = Optional.ofNullable(location).filter(l -> !l.isBlank()).orElse("");
            // SerpApi uses 'start' offset (multiples of 10)
            final int start = page * 10;

            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("engine", "google_jobs")
                            .queryParam("q", query + (where.isBlank() ? "" : " " + where))
                            .queryParam("start", start)
                            .queryParam("api_key", apiKey)
                            .build())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("jobs_results")) {
                return List.of();
            }

            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) response.get("jobs_results");
            List<JobResponse> jobs = new ArrayList<>();

            for (Map<String, Object> item : results) {
                String applyLink = extractApplyLink(item);
                jobs.add(new JobResponse(
                        null,
                        (String) item.get("job_id"),
                        "SERPAPI",
                        (String) item.get("title"),
                        (String) item.get("company_name"),
                        (String) item.getOrDefault("location", ""),
                        applyLink,
                        (String) item.get("description"),
                        buildSalary(item),
                        null,
                        buildJobType(item),
                        parsePostedAt(),
                        null
                ));
            }

            return jobs;
        } catch (Exception e) {
            log.error("SerpApi error: {}", e.getMessage());
            return List.of();
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private String extractApplyLink(Map<String, Object> item) {
        // Prefer the first apply option link
        if (item.get("apply_options") instanceof List<?> options && !options.isEmpty()) {
            Object first = options.get(0);
            if (first instanceof Map<?, ?> opt) {
                Object link = opt.get("link");
                if (link instanceof String s) return s;
            }
        }
        // Fall back to job_link
        return (String) item.getOrDefault("job_link", "");
    }

    private String buildSalary(Map<String, Object> item) {
        if (item.get("detected_extensions") instanceof Map<?, ?> ext) {
            Object salary = ext.get("salary");
            if (salary instanceof String s) return s;
        }
        return null;
    }

    private String buildJobType(Map<String, Object> item) {
        if (item.get("detected_extensions") instanceof Map<?, ?> ext) {
            Object type = ext.get("schedule_type");
            if (type instanceof String s) return s;
        }
        return null;
    }

    private LocalDateTime parsePostedAt() {
        // SerpApi does not return a machine-readable date; use scrape time
        return LocalDateTime.now();
    }
}
