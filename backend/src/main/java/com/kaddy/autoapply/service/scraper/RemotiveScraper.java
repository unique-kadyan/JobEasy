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

@Component
public non-sealed class RemotiveScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(RemotiveScraper.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;

    public RemotiveScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://remotive.com")
                .build();
    }

    @Override
    public String getSource() { return "REMOTIVE"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        try {
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/remote-jobs")
                            .queryParam("search", query)
                            .queryParam("limit", 50)
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

                results.add(JobResponse.unscored(
                        null,
                        String.valueOf(item.getOrDefault("id", "")),
                        "REMOTIVE",
                        (String) item.getOrDefault("title", ""),
                        (String) item.getOrDefault("company_name", ""),
                        (String) item.getOrDefault("candidate_required_location", "Worldwide"),
                        (String) item.getOrDefault("url", ""),
                        (String) item.getOrDefault("description", ""),
                        (String) item.getOrDefault("salary", null),
                        tags,
                        (String) item.getOrDefault("job_type", ""),
                        LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("Remotive scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
