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
 * Scrapes remote jobs from Working Nomads' free public API (no key required).
 * Docs: https://www.workingnomads.com/api/exposed_jobs/
 */
@Component
public non-sealed class WorkingNomadsScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(WorkingNomadsScraper.class);
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;

    public WorkingNomadsScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://www.workingnomads.com")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
    }

    @Override
    public String getSource() { return "WORKINGNOMADS"; }

    @Override
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        try {
            List<Map<String, Object>> raw = webClient.get()
                    .uri("/api/exposed_jobs/")
                    .retrieve()
                    .bodyToMono(LIST_TYPE)
                    .block();

            if (raw == null || raw.isEmpty()) return List.of();

            // Filter client-side by query keyword
            String q = (query != null) ? query.toLowerCase() : "";
            List<JobResponse> results = new ArrayList<>();

            for (Map<String, Object> item : raw) {
                String title = Optional.ofNullable((String) item.get("title")).orElse("");
                String description = Optional.ofNullable((String) item.get("description")).orElse("");
                String category = Optional.ofNullable((String) item.get("category")).orElse("");

                // Simple keyword relevance check
                if (!q.isBlank() &&
                    !title.toLowerCase().contains(q) &&
                    !description.toLowerCase().contains(q) &&
                    !category.toLowerCase().contains(q)) {
                    continue;
                }

                results.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable(item.get("id")).map(Object::toString).orElse(""),
                        "WORKINGNOMADS",
                        title,
                        Optional.ofNullable((String) item.get("company")).orElse(""),
                        "Remote",
                        Optional.ofNullable((String) item.get("url")).orElse(""),
                        description,
                        null,
                        List.of(),
                        Optional.ofNullable((String) item.get("job_type")).orElse(""),
                        LocalDateTime.now()
                ));

                if (results.size() >= 50) break; // cap per-source to 50
            }
            return results;
        } catch (Exception e) {
            log.error("Working Nomads scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
