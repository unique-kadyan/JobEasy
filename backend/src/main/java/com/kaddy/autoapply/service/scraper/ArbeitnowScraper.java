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
 * Scrapes jobs from Arbeitnow's free public API (no key required).
 * Docs: https://www.arbeitnow.com/api/job-board-api
 */
@Component
public non-sealed class ArbeitnowScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(ArbeitnowScraper.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;

    public ArbeitnowScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://www.arbeitnow.com")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
    }

    @Override
    public String getSource() { return "ARBEITNOW"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        try {
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/job-board-api")
                            .queryParam("search", query)
                            .queryParam("page", page + 1)
                            .build())
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("data")) return List.of();

            List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
            List<JobResponse> results = new ArrayList<>();

            for (Map<String, Object> item : data) {
                List<String> tags = item.get("tags") instanceof List<?> t
                        ? t.stream().map(Object::toString).toList()
                        : List.of();

                Boolean remote = Optional.ofNullable((Boolean) item.get("remote")).orElse(false);
                String loc = Boolean.TRUE.equals(remote) ? "Remote"
                        : Optional.ofNullable((String) item.get("location")).orElse("");

                results.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable((String) item.get("slug")).orElse(""),
                        "ARBEITNOW",
                        Optional.ofNullable((String) item.get("title")).orElse(""),
                        Optional.ofNullable((String) item.get("company_name")).orElse(""),
                        loc,
                        Optional.ofNullable((String) item.get("url")).orElse(""),
                        Optional.ofNullable((String) item.get("description")).orElse(""),
                        null,
                        tags,
                        item.get("job_types") instanceof List<?> jt && !jt.isEmpty()
                                ? jt.get(0).toString() : "",
                        LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("Arbeitnow scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
