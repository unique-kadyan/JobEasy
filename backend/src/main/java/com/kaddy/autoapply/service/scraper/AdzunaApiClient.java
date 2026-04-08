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

@Component
public class AdzunaApiClient implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(AdzunaApiClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String appId;
    private final String appKey;
    private final String country;

    public AdzunaApiClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.scraper.adzuna.app-id:}") String appId,
            @Value("${app.scraper.adzuna.app-key:}") String appKey,
            @Value("${app.scraper.adzuna.country:us}") String country) {
        this.webClient = webClientBuilder
                .baseUrl("https://api.adzuna.com")
                .build();
        this.appId = appId;
        this.appKey = appKey;
        this.country = country;
    }

    @Override
    public String getSource() {
        return "ADZUNA";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (appId == null || appId.isBlank() || appKey == null || appKey.isBlank()) {
            log.warn("Adzuna API credentials not configured");
            return List.of();
        }

        try {
            final int adzunaPage = page + 1;
            final String where = location != null ? location : "";

            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/api/jobs/{country}/search/{page}")
                            .queryParam("app_id", appId)
                            .queryParam("app_key", appKey)
                            .queryParam("results_per_page", 20)
                            .queryParam("what", query)
                            .queryParam("where", where)
                            .queryParam("sort_by", "date")
                            .queryParam("content-type", "application/json")
                            .build(country, adzunaPage))
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("results")) {
                return List.of();
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            List<JobResponse> jobs = new ArrayList<>();

            for (Map<String, Object> item : results) {
                Map<String, Object> company = (Map<String, Object>) item.getOrDefault("company", Map.of());
                Map<String, Object> loc = (Map<String, Object>) item.getOrDefault("location", Map.of());

                jobs.add(new JobResponse(
                        null,
                        (String) item.get("id"),
                        "ADZUNA",
                        (String) item.get("title"),
                        (String) company.getOrDefault("display_name", ""),
                        (String) loc.getOrDefault("display_name", ""),
                        (String) item.get("redirect_url"),
                        (String) item.get("description"),
                        buildSalary(item),
                        null,
                        (String) item.getOrDefault("contract_type", ""),
                        LocalDateTime.now(),
                        null
                ));
            }

            return jobs;
        } catch (Exception e) {
            log.error("Adzuna API error: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildSalary(Map<String, Object> item) {
        Object min = item.get("salary_min");
        Object max = item.get("salary_max");

        if (min == null && max == null) return null;
        if (min != null && max != null) return "£" + Math.round(((Number) min).doubleValue())
                + " - £" + Math.round(((Number) max).doubleValue());
        if (min != null) return "£" + Math.round(((Number) min).doubleValue()) + "+";
        if (max instanceof Number maxNum) return "Up to £" + Math.round(maxNum.doubleValue());
        return null;
    }
}
