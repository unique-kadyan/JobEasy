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
public non-sealed class JSearchApiClient implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(JSearchApiClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final String apiKey;

    public JSearchApiClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.scraper.jsearch-api-key}") String apiKey) {
        this.webClient = webClientBuilder
                .baseUrl("https://jsearch.p.rapidapi.com")
                .build();
        this.apiKey = apiKey;
    }

    @Override
    public String getSource() {
        return "JSEARCH";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("JSearch API key not configured");
            return List.of();
        }

        try {
            String searchQuery = query + Optional.ofNullable(location).map(l -> " in " + l).orElse("");

            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("query", searchQuery)
                            .queryParam("page", page + 1)
                            .queryParam("num_pages", 1)
                            .queryParam("date_posted", "week")
                            .build())
                    .header("X-RapidAPI-Key", apiKey)
                    .header("X-RapidAPI-Host", "jsearch.p.rapidapi.com")
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            if (response == null || !response.containsKey("data")) {
                return List.of();
            }

            List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
            List<JobResponse> jobs = new ArrayList<>();

            for (Map<String, Object> item : data) {
                String source = determineSource(
                        Optional.ofNullable((String) item.get("job_publisher")).orElse(""),
                        Optional.ofNullable((String) item.get("job_apply_link")).orElse(""));

                jobs.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable((String) item.get("job_id")).orElse(""),
                        source,
                        Optional.ofNullable((String) item.get("job_title")).orElse(""),
                        Optional.ofNullable((String) item.get("employer_name")).orElse(""),
                        buildLocation(item),
                        Optional.ofNullable((String) item.get("job_apply_link")).orElse(""),
                        Optional.ofNullable((String) item.get("job_description")).orElse(""),
                        buildSalary(item),
                        null,
                        Optional.ofNullable((String) item.get("job_employment_type")).orElse(""),
                        LocalDateTime.now()
                ));
            }

            return jobs;
        } catch (Exception e) {
            log.error("JSearch API error: {}", e.getMessage());
            return List.of();
        }
    }

    private String determineSource(String publisher, String applyLink) {
        String lower = (publisher + " " + applyLink).toLowerCase();
        if (lower.contains("linkedin")) return "LINKEDIN";
        if (lower.contains("indeed")) return "INDEED";
        return "INDEED";
    }

    private String buildLocation(Map<String, Object> item) {
        String city    = Optional.ofNullable((String) item.get("job_city")).orElse("");
        String state   = Optional.ofNullable((String) item.get("job_state")).orElse("");
        String country = Optional.ofNullable((String) item.get("job_country")).orElse("");
        Boolean isRemote = Optional.ofNullable((Boolean) item.get("job_is_remote")).orElse(false);

        if (Boolean.TRUE.equals(isRemote)) return "Remote";

        List<String> parts = new ArrayList<>();
        if (!city.isBlank()) parts.add(city);
        if (!state.isBlank()) parts.add(state);
        if (!country.isBlank() && parts.isEmpty()) parts.add(country);
        return String.join(", ", parts);
    }

    private String buildSalary(Map<String, Object> item) {
        Optional<Object> optMin = Optional.ofNullable(item.get("job_min_salary"));
        Optional<Object> optMax = Optional.ofNullable(item.get("job_max_salary"));
        String currency = (String) item.getOrDefault("job_salary_currency", "USD");

        if (optMin.isEmpty() && optMax.isEmpty()) return null;
        return optMin.flatMap(mn -> optMax.map(mx -> currency + " " + mn + " - " + mx))
                .or(() -> optMin.map(mn -> currency + " " + mn + "+"))
                .orElseGet(() -> "Up to " + currency + " " + optMax.orElse(""));
    }
}
