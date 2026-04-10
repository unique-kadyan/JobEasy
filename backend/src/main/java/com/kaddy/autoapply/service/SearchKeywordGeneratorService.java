package com.kaddy.autoapply.service;

import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SearchKeywordGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(SearchKeywordGeneratorService.class);

    private static final String SYSTEM_PROMPT = """
            You are a professional job search keyword strategist. \
            Your task is to generate a concise, highly targeted search query for job boards \
            such as LinkedIn, Indeed, and Glassdoor. \
            Rules:
            - Output ONLY the search query string — no explanation, no quotes, no bullet points, no markdown.
            - The query must be 2-6 words in a professional tone.
            - Prioritise seniority + role + 1-2 core technologies, e.g. "Senior Java Developer Spring Boot".
            - Do NOT include location in the query; it is passed separately.
            - Maximise the number of relevant job listings returned.""";

    private final AiProviderFactory aiProviderFactory;

    public SearchKeywordGeneratorService(AiProviderFactory aiProviderFactory) {
        this.aiProviderFactory = aiProviderFactory;
    }

    public String generateKeywords(User user, String location) {
        String userPrompt = buildUserPrompt(user, location);
        try {
            AiProviderFactory.GenerationResult result =
                    aiProviderFactory.generate(SYSTEM_PROMPT, userPrompt, null);
            String keyword = sanitize(result.content());
            if (!keyword.isBlank()) {
                log.info("AI generated search keywords '{}' for user {}", keyword, user.getId());
                return keyword;
            }
            log.warn("AI returned blank keyword for user {} — using fallback", user.getId());
        } catch (Exception e) {
            log.warn("AI keyword generation failed for user {}: {} — using fallback",
                    user.getId(), e.getMessage());
        }
        return fallback(user);
    }

    private String buildUserPrompt(User user, String location) {
        StringBuilder sb = new StringBuilder(
                "Generate a job search query for this professional profile:\n\n");

        if (user.getSkills() != null && !user.getSkills().isEmpty()) {
            List<String> skills = user.getSkills().values().stream()
                    .filter(v -> v instanceof List<?>)
                    .flatMap(v -> ((List<?>) v).stream())
                    .filter(s -> s instanceof String str && !str.isBlank())
                    .map(s -> (String) s)
                    .limit(15)
                    .toList();
            if (!skills.isEmpty()) {
                sb.append("Key skills: ").append(String.join(", ", skills)).append("\n");
            }
        }

        if (user.getTargetRoles() != null && !user.getTargetRoles().isEmpty()) {
            sb.append("Target roles: ")
              .append(String.join(", ", user.getTargetRoles()))
              .append("\n");
        }

        if (user.getTitle() != null && !user.getTitle().isBlank()) {
            sb.append("Current title: ").append(user.getTitle()).append("\n");
        }

        if (user.getExperienceYears() > 0) {
            sb.append("Years of experience: ").append(user.getExperienceYears()).append("\n");
        }

        if (location != null && !location.isBlank()) {
            sb.append("Target location: ").append(location)
              .append(" (do NOT add this to the query)\n");
        }

        sb.append("\nReturn ONE search query string only — no explanation, no punctuation.");
        return sb.toString();
    }

    private String fallback(User user) {
        if (user.getTargetRoles() != null && !user.getTargetRoles().isEmpty()) {
            return user.getTargetRoles().get(0);
        }
        if (user.getTitle() != null && !user.getTitle().isBlank()) {
            return user.getTitle();
        }
        return "";
    }

    private String sanitize(String raw) {
        if (raw == null) return "";
        return raw
                .replaceAll("[\"'`*_#]", "")
                .replaceAll("[\\n\\r]+", " ")
                .replaceAll("\\s{2,}", " ")
                .strip();
    }
}
