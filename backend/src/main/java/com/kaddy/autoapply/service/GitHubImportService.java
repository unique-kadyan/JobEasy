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

/**
 * Fetches a user's public GitHub profile, repositories, and languages/topics,
 * then merges them into the user's skill map in MongoDB.
 *
 * <p>Uses the GitHub REST API v3 (no token required for public data, but a token
 * in {@code GITHUB_TOKEN} env var is respected to raise rate limits from 60 → 5,000 req/hr).
 *
 * <p>Resilience4j circuit breaker {@code "github"} protects against GitHub outages.
 */
@Service
public class GitHubImportService {

    private static final Logger log = LoggerFactory.getLogger(GitHubImportService.class);

    private static final String CB_NAME = "github";
    private static final int    MAX_REPOS = 100;   // GitHub API maximum per page

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

        // Honour optional GitHub token for higher rate limits
        String token = System.getenv("GITHUB_TOKEN");
        if (token != null && !token.isBlank()) {
            builder = builder.defaultHeader("Authorization", "Bearer " + token);
        }

        this.webClient     = builder.build();
        this.userRepository = userRepository;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Imports skills from a GitHub username and merges them into {@code user.skills}.
     *
     * <p>Imported data:
     * <ul>
     *   <li>Programming languages (byte count converted to proficiency weight)</li>
     *   <li>Repository topics (treated as technology keywords)</li>
     *   <li>GitHub profile bio (stored separately as {@code githubBio})</li>
     * </ul>
     *
     * @param userId         the MongoDB user id
     * @param githubUsername the GitHub username to import from
     * @return updated {@link User} with merged skills
     * @throws ExternalServiceException if the GitHub API returns a non-2xx status
     */
    @CircuitBreaker(name = CB_NAME, fallbackMethod = "importFallback")
    public User importSkills(String userId, String githubUsername) {
        log.info("Starting GitHub import for user={} from github.com/{}", userId, githubUsername);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));

        Map<String, Object> profile  = fetchProfile(githubUsername);
        List<Map<String, Object>> repos = fetchRepos(githubUsername);

        Map<String, Object> mergedSkills = mergeSkills(user, profile, repos);

        // Store the GitHub URL if not already set
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

    // ── GitHub API fetchers ───────────────────────────────────────────────────

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

    // ── Skill merging ─────────────────────────────────────────────────────────

    /**
     * Merges GitHub-derived skills into the user's existing skill map.
     *
     * <p>Skill map structure: {@code { "Java": "ADVANCED", "React": "INTERMEDIATE", ... }}
     * GitHub languages with high byte counts are tagged {@code "ADVANCED"};
     * topics and minor languages are tagged {@code "FAMILIAR"}.
     * Existing proficiency levels already set by the user are NOT downgraded.
     */
    private Map<String, Object> mergeSkills(User user,
                                             Map<String, Object> profile,
                                             List<Map<String, Object>> repos) {
        Map<String, Object> skills = new LinkedHashMap<>(
                user.getSkills() != null ? user.getSkills() : Map.of());

        // 1. Aggregate language bytes across all repos
        Map<String, Long> langBytes = new LinkedHashMap<>();
        for (Map<String, Object> repo : repos) {
            Boolean fork = (Boolean) repo.getOrDefault("fork", false);
            if (Boolean.TRUE.equals(fork)) continue; // ignore forks — not the user's own work

            String repoName = (String) repo.get("name");
            if (repoName == null) continue;

            String primaryLang = (String) repo.get("language");
            if (primaryLang != null) {
                langBytes.merge(primaryLang, 1L, Long::sum);
            }
        }

        // 2. Classify languages by total byte count and assign proficiency
        long totalBytes = langBytes.values().stream().mapToLong(Long::longValue).sum();
        if (totalBytes > 0) {
            langBytes.forEach((lang, bytes) -> {
                double share = (double) bytes / totalBytes;
                String proficiency = share >= 0.30 ? "ADVANCED"
                                   : share >= 0.10 ? "INTERMEDIATE"
                                   : "FAMILIAR";
                // Do not downgrade an existing explicit level
                skills.merge(lang, proficiency, (existing, incoming) ->
                        levelRank(String.valueOf(incoming)) > levelRank(String.valueOf(existing))
                                ? incoming : existing);
            });
        }

        // 3. Extract topics from all non-fork repos
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

    // ── Circuit breaker fallback ──────────────────────────────────────────────

    @SuppressWarnings("unused")
    public User importFallback(String userId, String githubUsername, Throwable t) {
        log.error("GitHub import circuit breaker open for user={}: {}", userId, t.getMessage());
        throw new ExternalServiceException(
                "GitHub service is currently unavailable. Please try again later.");
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    /** Numeric rank used to avoid downgrading an existing proficiency level. */
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
