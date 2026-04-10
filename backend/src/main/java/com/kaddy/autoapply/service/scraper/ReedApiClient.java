package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public non-sealed class ReedApiClient implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(ReedApiClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;

    public ReedApiClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.scraper.reed.api-key:}") String apiKey) {
        this.webClient = webClientBuilder
                .baseUrl("https://www.reed.co.uk")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
        this.apiKey = apiKey;
    }

    @Override
    public String getSource() { return "REED"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("Reed API key not configured — skipping");
            return List.of();
        }

        try {

            String credentials = Base64.getEncoder().encodeToString(
                    (apiKey + ":").getBytes(StandardCharsets.UTF_8));

            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/1.0/search")
                            .queryParam("keywords", query)
                            .queryParam("locationName", Optional.ofNullable(location).orElse(""))
                            .queryParam("resultsToSkip", page * 25)
                            .queryParam("resultsToTake", 25)
                            .build())
                    .header("Authorization", "Basic " + credentials)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("results")) return List.of();

            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) response.get("results");
            List<JobResponse> jobs = new ArrayList<>();

            for (Map<String, Object> item : results) {
                String salary = buildSalary(item);
                jobs.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable(item.get("jobId")).map(Object::toString).orElse(""),
                        "REED",
                        (String) item.getOrDefault("jobTitle", ""),
                        (String) item.getOrDefault("employerName", ""),
                        (String) item.getOrDefault("locationName", ""),
                        (String) item.getOrDefault("jobUrl", ""),
                        (String) item.getOrDefault("jobDescription", ""),
                        salary,
                        List.of(),
                        (String) item.getOrDefault("contractType", ""),
                        LocalDateTime.now()
                ));
            }
            return jobs;
        } catch (Exception e) {
            log.error("Reed API error: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildSalary(Map<String, Object> item) {
        Object min = item.get("minimumSalary");
        Object max = item.get("maximumSalary");
        if (min == null && max == null) return null;
        if (min != null && max != null)
            return "£" + Math.round(((Number) min).doubleValue())
                    + " - £" + Math.round(((Number) max).doubleValue());
        if (min != null) return "£" + Math.round(((Number) min).doubleValue()) + "+";
        return "Up to £" + Math.round(((Number) max).doubleValue());
    }
}
