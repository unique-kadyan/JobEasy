package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class JobScoringService {

    private static final Logger log = LoggerFactory.getLogger(JobScoringService.class);

    static final double AI_EVALUATION_THRESHOLD = 0.35;

    private static final double MAX_SKILL_WEIGHT = 0.70;
    private static final double ROLE_BONUS = 0.10;
    private static final double REMOTE_BONUS = 0.05;
    private static final double CITY_BONUS = 0.10;
    private static final double SENIORITY_BONUS = 0.05;

    private static final Map<String, int[]> SENIORITY_RANGES = Map.of(
            "intern", new int[] { 0, 1 },
            "junior", new int[] { 0, 3 },
            "entry", new int[] { 0, 2 },
            "mid", new int[] { 2, 6 },
            "senior", new int[] { 4, 99 },
            "staff", new int[] { 6, 99 },
            "principal", new int[] { 8, 99 },
            "lead", new int[] { 5, 99 });

    private final AiProviderFactory aiProviderFactory;
    private final SalaryNormalizationService salaryNormalizationService;

    public JobScoringService(AiProviderFactory aiProviderFactory,
            SalaryNormalizationService salaryNormalizationService) {
        this.aiProviderFactory = aiProviderFactory;
        this.salaryNormalizationService = salaryNormalizationService;
    }

    public JobResponse scoreLocally(User user, JobResponse job) {
        if (user == null)
            return job;

        Set<String> userSkills = extractSkills(user);
        String searchText = buildSearchText(job);

        SkillMatchResult skillMatch = matchSkills(userSkills, searchText);
        double score = skillMatch.ratio() * MAX_SKILL_WEIGHT;

        score += roleTitleBonus(user, job);
        score += locationBonus(user, job);
        score += seniorityBonus(user, searchText);

        score = Math.min(1.0, score);

        String strength = classify(score);
        Double normalizedSalary = salaryNormalizationService.toAnnualUsd(job.salary());

        log.debug("Local score for job '{}' @ '{}': score={}, strength={}, missing={}",
                job.title(), job.company(), String.format("%.2f", score), strength,
                skillMatch.missing());

        return job.withScore(score, strength, skillMatch.missing(), List.of(), normalizedSalary);
    }

    public CompletableFuture<JobResponse> enrichWithAi(User user, JobResponse scoredJob) {
        if (scoredJob.matchScore() == null || scoredJob.matchScore() < AI_EVALUATION_THRESHOLD) {
            return CompletableFuture.completedFuture(scoredJob);
        }

        return CompletableFuture.<JobResponse>supplyAsync(() -> {
            try {
                String systemPrompt = buildAiSystemPrompt(user);
                String userPrompt = buildAiUserPrompt(user, scoredJob);

                AiProviderFactory.GenerationResult result = aiProviderFactory.generate(systemPrompt, userPrompt,
                        AiProviderFactory.TaskType.FAST_TEXT);

                AiEvalResult eval = parseAiEvaluation(result.content());

                double localScore = scoredJob.matchScore();
                double blended = 0.4 * localScore + 0.6 * eval.score();
                blended = Math.min(1.0, Math.max(0.0, blended));

                return scoredJob.withScore(
                        blended,
                        classify(blended),
                        scoredJob.missingSkills(),
                        eval.reasoning(),
                        scoredJob.normalizedSalaryUsd());
            } catch (Exception e) {
                log.warn("AI enrichment failed for job '{}': {}", scoredJob.title(), e.getMessage());
                return scoredJob;
            }
        });
    }

    public CompletableFuture<JobResponse> score(User user, JobResponse job) {
        JobResponse locallyScored = scoreLocally(user, job);
        return enrichWithAi(user, locallyScored);
    }

    public List<JobResponse> scoreAndFilterBatch(User user, List<JobResponse> jobs) {
        if (user == null)
            return jobs;

        Set<String> skipKeywords = normaliseKeywords(user.getSkipKeywords());

        return jobs.stream()
                .filter(j -> !matchesSkipKeywords(j, skipKeywords))
                .map(j -> scoreLocally(user, j))
                .sorted(Comparator.comparingDouble(
                        j -> j.matchScore() != null ? -j.matchScore() : 0.0))
                .collect(Collectors.toList());
    }

    private Set<String> extractSkills(User user) {
        if (user.getSkills() == null || user.getSkills().isEmpty())
            return Set.of();

        return user.getSkills().values().stream()
                .filter(v -> v instanceof List<?>)
                .flatMap(v -> ((List<?>) v).stream())
                .filter(k -> k instanceof String s && !s.isBlank())
                .map(k -> ((String) k).toLowerCase())
                .collect(Collectors.toSet());
    }

    private String buildSearchText(JobResponse job) {
        String title = job.title() != null ? job.title() : "";
        String desc = job.description() != null ? job.description() : "";
        String tags = job.tags() != null ? String.join(" ", job.tags()) : "";
        return (title + " " + desc + " " + tags).toLowerCase();
    }

    private SkillMatchResult matchSkills(Set<String> userSkills, String text) {
        if (userSkills.isEmpty())
            return new SkillMatchResult(0.0, List.of());

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (String skill : userSkills) {

            String escaped = Pattern.quote(skill);
            Pattern pattern = Pattern.compile("\\b" + escaped + "\\b", Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(text).find()) {
                matched.add(skill);
            } else {
                missing.add(skill);
            }
        }

        double ratio = (double) matched.size() / userSkills.size();
        return new SkillMatchResult(ratio, Collections.unmodifiableList(missing));
    }

    private double roleTitleBonus(User user, JobResponse job) {
        if (user.getTargetRoles() == null || user.getTargetRoles().isEmpty())
            return 0.0;
        if (job.title() == null)
            return 0.0;

        String titleLower = job.title().toLowerCase();
        return user.getTargetRoles().stream()
                .anyMatch(role -> role != null && titleLower.contains(role.toLowerCase()))
                        ? ROLE_BONUS
                        : 0.0;
    }

    private double locationBonus(User user, JobResponse job) {
        if (job.location() == null)
            return 0.0;
        String jobLoc = job.location().toLowerCase();

        if (jobLoc.contains("remote") || jobLoc.contains("worldwide") || jobLoc.contains("anywhere")) {
            return REMOTE_BONUS;
        }

        if (user.getLocation() != null && !user.getLocation().isBlank()) {
            String userCity = user.getLocation().toLowerCase().split(",")[0].trim();
            if (!userCity.isEmpty() && jobLoc.contains(userCity))
                return CITY_BONUS;
        }

        return 0.0;
    }

    private double seniorityBonus(User user, String text) {
        int exp = user.getExperienceYears();
        for (Map.Entry<String, int[]> entry : SENIORITY_RANGES.entrySet()) {
            if (text.contains(entry.getKey())) {
                int[] range = entry.getValue();
                if (exp >= range[0] && exp <= range[1])
                    return SENIORITY_BONUS;
            }
        }
        return 0.0;
    }

    private String classify(double score) {
        if (score >= 0.60)
            return "STRONG";
        if (score >= 0.35)
            return "MODERATE";
        return "WEAK";
    }

    private Set<String> normaliseKeywords(List<String> keywords) {
        if (keywords == null)
            return Set.of();
        return keywords.stream()
                .filter(k -> k != null && !k.isBlank())
                .map(String::toLowerCase)
                .collect(Collectors.toSet());
    }

    private boolean matchesSkipKeywords(JobResponse job, Set<String> skipKeywords) {
        if (skipKeywords.isEmpty())
            return false;
        String combined = ((job.title() != null ? job.title() : "") + " " +
                (job.company() != null ? job.company() : "") + " " +
                (job.description() != null ? job.description() : "")).toLowerCase();
        return skipKeywords.stream().anyMatch(combined::contains);
    }

    private String buildAiSystemPrompt(User user) {
        return """
                You are a career advisor evaluating job-candidate fit.
                Return ONLY this JSON object — no markdown, no extra text:
                {"score": <integer 0-100>, "reasoning": ["reason 1", "reason 2", "reason 3"]}
                Rules:
                - score: 0-100 integer representing overall fit (skills + experience + role alignment)
                - reasoning: 3-5 concise strings explaining the match quality
                - Be specific: mention exact skills, years of experience, seniority alignment
                - Note: Java != JavaScript when evaluating skill matches
                """;
    }

    private String buildAiUserPrompt(User user, JobResponse job) {

        String skills = user.getSkills() != null
                ? user.getSkills().values().stream()
                        .filter(v -> v instanceof List<?>)
                        .flatMap(v -> ((List<?>) v).stream())
                        .map(Object::toString)
                        .filter(s -> !s.isBlank())
                        .collect(java.util.stream.Collectors.joining(", "))
                : "not specified";
        if (skills.isBlank())
            skills = "not specified";

        String targetRoles = user.getTargetRoles() != null
                ? String.join(", ", user.getTargetRoles())
                : "not specified";

        String missing = job.missingSkills() != null && !job.missingSkills().isEmpty()
                ? String.join(", ", job.missingSkills())
                : "none";

        return String.format("""
                Evaluate this job-candidate match:

                CANDIDATE:
                - Skills: %s
                - Experience: %d years
                - Target roles: %s
                - Location: %s

                JOB:
                - Title: %s
                - Company: %s
                - Location: %s
                - Type: %s
                - Description (first 800 chars): %s

                LOCAL SCORE: %.0f%%
                MISSING SKILLS: %s

                Provide 3-5 reasoning strings as a JSON array.
                """,
                skills,
                user.getExperienceYears(),
                targetRoles,
                user.getLocation() != null ? user.getLocation() : "not specified",
                job.title(),
                job.company(),
                job.location(),
                job.jobType(),
                truncate(job.description(), 800),
                (job.matchScore() != null ? job.matchScore() * 100 : 0),
                missing);
    }

    private List<String> parseAiReasoning(String content) {
        if (content == null || content.isBlank())
            return List.of();
        try {

            String cleaned = content.strip()
                    .replaceAll("^```json\\s*", "")
                    .replaceAll("^```\\s*", "")
                    .replaceAll("```$", "")
                    .strip();

            if (!cleaned.startsWith("["))
                return List.of(cleaned);

            List<String> lines = new ArrayList<>();
            int i = 0;
            while (i < cleaned.length()) {
                int start = cleaned.indexOf('"', i);
                if (start == -1)
                    break;
                int end = cleaned.indexOf('"', start + 1);
                while (end != -1 && cleaned.charAt(end - 1) == '\\') {
                    end = cleaned.indexOf('"', end + 1);
                }
                if (end == -1)
                    break;
                String token = cleaned.substring(start + 1, end).replace("\\\"", "\"");
                if (!token.isBlank())
                    lines.add(token);
                i = end + 1;
            }
            return Collections.unmodifiableList(lines);
        } catch (Exception e) {
            log.warn("Failed to parse AI reasoning response: {}", e.getMessage());
            return List.of();
        }
    }

    private String truncate(String s, int maxLen) {
        if (s == null)
            return "";
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "…";
    }

    private record SkillMatchResult(double ratio, List<String> missing) {}

    private record AiEvalResult(double score, List<String> reasoning) {
        static AiEvalResult fallback(double localScore) {
            return new AiEvalResult(localScore, List.of());
        }
    }

    private AiEvalResult parseAiEvaluation(String content) {
        if (content == null || content.isBlank()) return AiEvalResult.fallback(0);
        try {
            String cleaned = content.strip()
                    .replaceAll("^```json\\s*", "").replaceAll("^```\\s*", "")
                    .replaceAll("```$", "").strip();

            // Expected: {"score": 72, "reasoning": ["...", "..."]}
            double aiScore = 0;
            List<String> reasoning = new ArrayList<>();

            int scoreIdx = cleaned.indexOf("\"score\"");
            if (scoreIdx >= 0) {
                int colon = cleaned.indexOf(':', scoreIdx);
                int comma = cleaned.indexOf(',', colon);
                int brace = cleaned.indexOf('}', colon);
                int end = (comma > 0 && comma < brace) ? comma : brace;
                if (end > colon) {
                    String num = cleaned.substring(colon + 1, end).trim();
                    aiScore = Double.parseDouble(num) / 100.0; // normalise to 0-1
                }
            }

            int arrStart = cleaned.indexOf('[');
            int arrEnd   = cleaned.lastIndexOf(']');
            if (arrStart >= 0 && arrEnd > arrStart) {
                String arr = cleaned.substring(arrStart, arrEnd + 1);
                reasoning = parseAiReasoning(arr);
            }

            return new AiEvalResult(Math.min(1.0, Math.max(0.0, aiScore)), reasoning);
        } catch (Exception e) {
            log.warn("Failed to parse AI evaluation response: {}", e.getMessage());
            return AiEvalResult.fallback(0);
        }
    }
}
