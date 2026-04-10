package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Searches US federal government jobs via the USAJOBS API.
 * Free API key: https://developer.usajobs.gov/APIRequest/Index
 * Requires registration at developer.usajobs.gov.
 */
@Component
public non-sealed class UsaJobsApiClient implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(UsaJobsApiClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;
    private final String userAgent; // USAJOBS requires a registered email as User-Agent

    public UsaJobsApiClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.scraper.usajobs.api-key:}") String apiKey,
            @Value("${app.scraper.usajobs.user-agent:kaddy@example.com}") String userAgent) {
        this.webClient = webClientBuilder
                .baseUrl("https://data.usajobs.gov")
                .build();
        this.apiKey   = apiKey;
        this.userAgent = userAgent;
    }

    @Override
    public String getSource() { return "USAJOBS"; }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("USAJOBS API key not configured — skipping");
            return List.of();
        }

        try {
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/search")
                            .queryParam("Keyword", query)
                            .queryParam("LocationName", Optional.ofNullable(location).orElse(""))
                            .queryParam("ResultsPerPage", 25)
                            .queryParam("Page", page + 1)
                            .build())
                    .header("Authorization-Key", apiKey)
                    .header("User-Agent", userAgent)
                    .header("Host", "data.usajobs.gov")
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null) return List.of();

            Map<String, Object> searchResult =
                    (Map<String, Object>) response.get("SearchResult");
            if (searchResult == null) return List.of();

            List<Map<String, Object>> items =
                    (List<Map<String, Object>>) searchResult.get("SearchResultItems");
            if (items == null) return List.of();

            List<JobResponse> results = new ArrayList<>();
            for (Map<String, Object> wrapper : items) {
                Map<String, Object> item =
                        (Map<String, Object>) wrapper.get("MatchedObjectDescriptor");
                if (item == null) continue;

                String id = Optional.ofNullable(
                        (String) ((Map<?, ?>) wrapper.getOrDefault("MatchedObjectId", Map.of()))
                                .get("Value"))
                        .orElse("");

                // Location list
                String loc = "United States";
                Object locsObj = item.get("PositionLocation");
                if (locsObj instanceof List<?> locs && !locs.isEmpty()) {
                    Object first = locs.getFirst();
                    if (first instanceof Map<?, ?> m) {
                        loc = Optional.ofNullable(m.get("LocationName"))
                                .map(Object::toString).orElse("United States");
                    }
                }

                // Salary
                String salary = null;
                Object remObj = item.get("PositionRemuneration");
                if (remObj instanceof List<?> rems && !rems.isEmpty()) {
                    Object first = rems.getFirst();
                    if (first instanceof Map<?, ?> m) {
                        Object min = m.get("MinimumRange");
                        Object max = m.get("MaximumRange");
                        if (min != null && max != null) {
                            salary = "$" + min + " - $" + max + " / yr";
                        }
                    }
                }

                results.add(JobResponse.unscored(
                        null, id, "USAJOBS",
                        (String) item.getOrDefault("PositionTitle", ""),
                        (String) item.getOrDefault("OrganizationName", ""),
                        loc,
                        (String) item.getOrDefault("PositionURI", ""),
                        (String) item.getOrDefault("QualificationSummary", ""),
                        salary,
                        List.of(),
                        (String) item.getOrDefault("PositionSchedule", ""),
                        LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("USAJOBS API error: {}", e.getMessage());
            return List.of();
        }
    }
}
