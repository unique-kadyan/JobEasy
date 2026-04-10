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

@Component
public non-sealed class DevITJobsScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(DevITJobsScraper.class);
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;

    public DevITJobsScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://www.devitjobs.com")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .codecs(c -> c.defaultCodecs().maxInMemorySize(5 * 1024 * 1024))
                .build();
    }

    @Override
    public String getSource() { return "DEVITJOBS"; }

    @Override
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        try {
            List<Map<String, Object>> raw = webClient.get()
                    .uri("/api/jobsLight")
                    .retrieve()
                    .bodyToMono(LIST_TYPE)
                    .block();

            if (raw == null || raw.isEmpty()) return List.of();

            String q = (query != null) ? query.toLowerCase() : "";
            List<JobResponse> results = new ArrayList<>();

            for (Map<String, Object> item : raw) {
                String title = Optional.ofNullable((String) item.get("title")).orElse("");
                String techStack = item.get("techStack") instanceof List<?> ts
                        ? ts.stream().map(Object::toString).reduce("", (a, b) -> a + " " + b).toLowerCase()
                        : "";

                if (!q.isBlank() &&
                    !title.toLowerCase().contains(q) &&
                    !techStack.contains(q)) {
                    continue;
                }

                List<String> tags = item.get("techStack") instanceof List<?> ts
                        ? ts.stream().map(Object::toString).toList()
                        : List.of();

                String loc = Boolean.TRUE.equals(item.get("isRemote")) ? "Remote"
                        : Optional.ofNullable((String) item.get("location")).orElse("");

                results.add(JobResponse.unscored(
                        null,
                        Optional.ofNullable(item.get("id")).map(Object::toString).orElse(""),
                        "DEVITJOBS",
                        title,
                        Optional.ofNullable((String) item.get("company")).orElse(""),
                        loc,
                        "https://www.devitjobs.com/jobs/" +
                                Optional.ofNullable(item.get("id")).map(Object::toString).orElse(""),
                        Optional.ofNullable((String) item.get("description")).orElse(""),
                        null,
                        tags,
                        Optional.ofNullable((String) item.get("jobType")).orElse(""),
                        LocalDateTime.now()
                ));

                if (results.size() >= 50) break;
            }
            return results;
        } catch (Exception e) {
            log.error("DevITJobs scraper error: {}", e.getMessage());
            return List.of();
        }
    }
}
