package com.kaddy.autoapply.service;

import com.kaddy.autoapply.exception.ExternalServiceException;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.UserRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class GitHubImportService {

    private static final Logger log = LoggerFactory.getLogger(GitHubImportService.class);

    private static final String CB_NAME = "github";
    private static final int    MAX_REPOS = 100;

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final UserRepository userRepository;

    public GitHubImportService(WebClient.Builder webClientBuilder,
                               UserRepository userRepository) {
        WebClient.Builder builder = webClientBuilder
                .baseUrl("https://api.github.com")
                .defaultHeader("Accept", "application/vnd.github.v3+json");

        String token = System.getenv("GITHUB_TOKEN");
        if (token != null && !token.isBlank()) {
            builder = builder.defaultHeader("Authorization", "Bearer " + token);
        }

        this.webClient     = builder.build();
        this.userRepository = userRepository;
    }

    @CircuitBreaker(name = CB_NAME, fallbackMethod = "importFallback")
    public User importSkills(String userId, String githubUsername) {
        log.info("Starting GitHub import for user={} from github.com/{}", userId, githubUsername);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));

        Map<String, Object> profile  = fetchProfile(githubUsername);
        List<Map<String, Object>> repos = fetchRepos(githubUsername);

        Map<String, Object> mergedSkills = mergeSkills(user, profile, repos);

        String profileHtmlUrl = (String) profile.getOrDefault("html_url", null);
        if (profileHtmlUrl != null && (user.getGithubUrl() == null || user.getGithubUrl().isBlank())) {
            user.setGithubUrl(profileHtmlUrl);
        }

        user.setSkills(mergedSkills);
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        log.info("GitHub import complete for user={}: {} skills in profile", userId, mergedSkills.size());
        return saved;
    }

    private Map<String, Object> fetchProfile(String username) {
        try {
            Map<String, Object> profile = webClient.get()
                    .uri("/users/{username}", username)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();
            return profile != null ? profile : Map.of();
        } catch (WebClientResponseException.NotFound e) {
            throw new ExternalServiceException("GitHub user not found: " + username);
        } catch (WebClientResponseException e) {
            throw new ExternalServiceException("GitHub API error: " + e.getStatusCode());
        }
    }

    private List<Map<String, Object>> fetchRepos(String username) {
        try {
            List<Map<String, Object>> repos = webClient.get()
                    .uri(u -> u.path("/users/{username}/repos")
                               .queryParam("per_page", MAX_REPOS)
                               .queryParam("sort", "updated")
                               .queryParam("type", "owner")
                               .build(username))
                    .retrieve()
                    .bodyToMono(LIST_TYPE)
                    .block();
            return repos != null ? repos : List.of();
        } catch (WebClientResponseException e) {
            log.warn("Failed to fetch repos for {}: {}", username, e.getMessage());
            return List.of();
        }
    }

    private Map<String, Object> mergeSkills(User user,
                                             Map<String, Object> profile,
                                             List<Map<String, Object>> repos) {
        Map<String, Object> skills = new LinkedHashMap<>(
                user.getSkills() != null ? user.getSkills() : Map.of());

        Map<String, Long> langBytes = new LinkedHashMap<>();
        for (Map<String, Object> repo : repos) {
            Boolean fork = (Boolean) repo.getOrDefault("fork", false);
            if (Boolean.TRUE.equals(fork)) continue;

            String repoName = (String) repo.get("name");
            if (repoName == null) continue;

            String primaryLang = (String) repo.get("language");
            if (primaryLang != null) {
                langBytes.merge(primaryLang, 1L, Long::sum);
            }
        }

        long totalBytes = langBytes.values().stream().mapToLong(Long::longValue).sum();
        if (totalBytes > 0) {
            langBytes.forEach((lang, bytes) -> {
                double share = (double) bytes / totalBytes;
                String proficiency = share >= 0.30 ? "ADVANCED"
                                   : share >= 0.10 ? "INTERMEDIATE"
                                   : "FAMILIAR";

                skills.merge(lang, proficiency, (existing, incoming) ->
                        levelRank(String.valueOf(incoming)) > levelRank(String.valueOf(existing))
                                ? incoming : existing);
            });
        }

        for (Map<String, Object> repo : repos) {
            if (Boolean.TRUE.equals(repo.get("fork"))) continue;
            if (repo.get("topics") instanceof List<?> topics) {
                topics.stream()
                      .filter(t -> t instanceof String)
                      .map(t -> capitalise((String) t))
                      .forEach(topic -> skills.putIfAbsent(topic, "FAMILIAR"));
            }
        }

        return skills;
    }

    @SuppressWarnings("unused")
    public User importFallback(String userId, String githubUsername, Throwable t) {
        log.error("GitHub import circuit breaker open for user={}: {}", userId, t.getMessage());
        throw new ExternalServiceException(
                "GitHub service is currently unavailable. Please try again later.");
    }

    private int levelRank(String level) {
        return switch (level == null ? "" : level.toUpperCase()) {
            case "ADVANCED"     -> 3;
            case "INTERMEDIATE" -> 2;
            case "FAMILIAR"     -> 1;
            default             -> 0;
        };
    }

    private String capitalise(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}
