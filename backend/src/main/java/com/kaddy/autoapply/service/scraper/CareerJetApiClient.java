package com.kaddy.autoapply.service.scraper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Scrapes jobs from CareerJet via their public API.
 * Docs: https://www.careerjet.com/partners/api/
 */
@Component
public non-sealed class CareerJetApiClient implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(CareerJetApiClient.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String affiliateId;
    private final String locale;

    public CareerJetApiClient(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${app.scraper.careerjet.affiliate-id:}") String affiliateId,
            @Value("${app.scraper.careerjet.locale:en_IN}") String locale) {
        this.webClient = webClientBuilder
                .baseUrl("http://public.api.careerjet.net")
                .build();
        this.objectMapper = objectMapper;
        this.affiliateId = affiliateId;
        this.locale = locale;
    }

    @Override
    public String getSource() {
        return "CAREERJET";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (affiliateId == null || affiliateId.isBlank()) {
            log.warn("CareerJet affiliate ID not configured");
            return List.of();
        }

        try {
            final String where = Optional.ofNullable(location).filter(l -> !l.isBlank()).orElse("");
            final int cjPage = page + 1; // CareerJet pages start at 1

            // CareerJet returns JSON with Content-Type: text/plain — receive as String, parse manually
            String raw = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search/jobs")
                            .queryParam("affid", affiliateId)
                            .queryParam("keywords", query)
                            .queryParam("location", where)
                            .queryParam("pagesize", 20)
                            .queryParam("page", cjPage)
                            .queryParam("locale_code", locale)
                            .queryParam("sort", "date")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (raw == null || raw.isBlank()) return List.of();

            Map<String, Object> response = objectMapper.readValue(raw, MAP_TYPE);

            if (!response.containsKey("jobs")) {
                return List.of();
            }

            List<Map<String, Object>> jobs = (List<Map<String, Object>>) response.get("jobs");
            List<JobResponse> results = new ArrayList<>();

            for (Map<String, Object> item : jobs) {
                results.add(JobResponse.unscored(
                        null,
                        buildExternalId(item),
                        "CAREERJET",
                        Optional.ofNullable((String) item.get("title")).orElse(""),
                        Optional.ofNullable((String) item.get("company")).orElse(""),
                        Optional.ofNullable((String) item.get("locations")).orElse(""),
                        Optional.ofNullable((String) item.get("url")).orElse(""),
                        Optional.ofNullable((String) item.get("description")).orElse(""),
                        buildSalary(item),
                        null,
                        null,
                        LocalDateTime.now()
                ));
            }

            return results;
        } catch (Exception e) {
            log.error("CareerJet API error: {}", e.getMessage());
            return List.of();
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private String buildExternalId(Map<String, Object> item) {
        // CareerJet has no stable job ID; derive one from the URL
        return Optional.ofNullable((String) item.get("url"))
                .map(url -> "cj-" + Math.abs(url.hashCode()))
                .orElse(null);
    }

    private String buildSalary(Map<String, Object> item) {
        Object salary = item.get("salary");
        return salary instanceof String s && !s.isBlank() ? s : null;
    }
}
