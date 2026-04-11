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

// Disabled by default — returns 400 Bad Request.
// To re-enable: set app.scraper.jobicy.enabled=true in application.properties
@Component
public non-sealed class JobicyScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(JobicyScraper.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    @Value("${app.scraper.jobicy.enabled:false}")
    private boolean enabled;

    private final WebClient webClient;

    public JobicyScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://jobicy.com")
                .build();
    }

    @Override
    public String getSource() { return "JOBICY"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (!enabled) return List.of();
        try {
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v2/remote-jobs")
                            .queryParam("count", 50)
                            .queryParam("geo", "worldwide")
                            .queryParam("tag", query)
                            .build())
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("jobs")) return List.of();

            List<Map<String, Object>> jobs = (List<Map<String, Object>>) response.get("jobs");
            List<JobResponse> results = new ArrayList<>();

            for (Map<String, Object> item : jobs) {
                results.add(JobResponse.unscored(
                        null,
                        String.valueOf(item.getOrDefault("id", "")),
                        "JOBICY",
                        (String) item.getOrDefault("jobTitle", ""),
                        (String) item.getOrDefault("companyName", ""),
                        (String) item.getOrDefault("jobGeo", "Remote"),
                        (String) item.getOrDefault("jobURL", ""),
                        (String) item.getOrDefault("jobDescription", ""),
                        null,
                        List.of(),
                        (String) item.getOrDefault("jobType", ""),
                        LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("Jobicy scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
