package com.kaddy.autoapply.service;

import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.enums.FeatureType;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.ResumeRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeOptimizationService {

    private static final Logger log = LoggerFactory.getLogger(ResumeOptimizationService.class);

    private static final String CB_NAME = "ai";

    private static final int MAX_RESUME_CHARS = 4_000;

    private static final int MAX_JD_CHARS = 2_000;

    private final ResumeRepository   resumeRepository;
    private final UserRepository     userRepository;
    private final AiProviderFactory  aiProviderFactory;
    private final FeatureUsageService featureUsageService;

    public ResumeOptimizationService(ResumeRepository resumeRepository,
                                     UserRepository userRepository,
                                     AiProviderFactory aiProviderFactory,
                                     FeatureUsageService featureUsageService) {
        this.resumeRepository     = resumeRepository;
        this.userRepository       = userRepository;
        this.aiProviderFactory    = aiProviderFactory;
        this.featureUsageService  = featureUsageService;
    }

    @CircuitBreaker(name = CB_NAME, fallbackMethod = "optimizeFallback")
    public OptimizationResult optimize(String userId,
                                       String resumeId,
                                       String jobTitle,
                                       String company,
                                       String jobDescription,
                                       String preferredAi) {
        validateInputs(jobTitle, jobDescription);

        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found: " + resumeId));

        SecurityUtils.assertOwnerOrAdmin(resume.getUserId(), userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        String resumeText = resume.getParsedText();
        if (resumeText == null || resumeText.isBlank()) {
            throw new BadRequestException(
                    "Resume has no parsed text. Please re-upload the resume to enable optimisation.");
        }

        String systemPrompt = buildSystemPrompt();
        String userPrompt   = buildUserPrompt(user, resumeText, jobTitle, company, jobDescription);

        log.info("Resume optimisation requested: user={}, resume={}, job='{}'",
                userId, resumeId, jobTitle);

        AiProviderFactory.GenerationResult result =
                aiProviderFactory.generate(systemPrompt, userPrompt, preferredAi);

        log.info("Resume optimisation complete: user={}, provider={}", userId, result.providerName());
        featureUsageService.record(userId, FeatureType.RESUME_OPTIMIZED, resumeId);

        return new OptimizationResult(result.content(), result.providerName());
    }

    @SuppressWarnings("unused")
    public OptimizationResult optimizeFallback(String userId, String resumeId,
                                                String jobTitle, String company,
                                                String jobDescription, String preferredAi,
                                                Throwable t) {
        log.error("Resume optimisation circuit breaker open for user={}: {}", userId, t.getMessage());
        throw new com.kaddy.autoapply.exception.AiServiceException(
                "AI optimisation service is temporarily unavailable. Please try again later.");
    }

    private String buildSystemPrompt() {
        return """
                You are an expert career coach and ATS (Applicant Tracking System) specialist.
                Your task is to rewrite resume content to maximise relevance for a specific job.

                Output format — return valid JSON with this structure:
                {
                  "summary": "<2-3 sentence tailored professional summary>",
                  "bullets": [
                    "<action-verb led bullet with quantifiable impact>",
                    ...up to 8 bullets...
                  ],
                  "keywords": ["keyword1", "keyword2", ...],
                  "atsScore": <0-100 estimated ATS match score>,
                  "suggestions": ["<improvement suggestion>", ...]
                }

                Rules:
                - Start every bullet with a strong action verb
                - Include metrics/numbers where possible (derive from existing resume)
                - Mirror the language and keywords used in the job description
                - Do not fabricate facts; only enhance how existing experience is presented
                - Return ONLY the JSON — no markdown, no extra text
                """;
    }

    private String buildUserPrompt(User user, String resumeText,
                                    String jobTitle, String company,
                                    String jobDescription) {

        String skills = user.getSkills() != null
                ? user.getSkills().values().stream()
                        .filter(v -> v instanceof java.util.List<?>)
                        .flatMap(v -> ((java.util.List<?>) v).stream())
                        .map(Object::toString)
                        .filter(s -> !s.isBlank())
                        .collect(java.util.stream.Collectors.joining(", "))
                : "not listed";
        if (skills.isBlank()) skills = "not listed";

        return String.format("""
                CANDIDATE PROFILE:
                Name: %s
                Current title: %s
                Experience: %d years
                Skills: %s

                TARGET JOB:
                Title: %s
                Company: %s
                Description:
                %s

                CURRENT RESUME TEXT:
                %s

                Please generate optimised resume content for this job.
                """,
                user.getName() != null ? user.getName() : "Candidate",
                user.getTitle() != null ? user.getTitle() : "Not specified",
                user.getExperienceYears(),
                skills,
                sanitizeForPrompt(jobTitle),
                sanitizeForPrompt(company != null ? company : "Not specified"),
                truncate(sanitizeForPrompt(jobDescription), MAX_JD_CHARS),
                truncate(resumeText, MAX_RESUME_CHARS)
        );
    }

    private String sanitizeForPrompt(String input) {
        if (input == null) return "";
        return input
                .replaceAll("(?i)(SYSTEM|HUMAN|ASSISTANT|USER)\\s*:", "[$1]:")
                .replaceAll("```", "'''")
                .replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "")
                .strip();
    }

    private void validateInputs(String jobTitle, String jobDescription) {
        if (jobTitle == null || jobTitle.isBlank()) {
            throw new BadRequestException("Job title is required for resume optimisation");
        }
        if (jobDescription == null || jobDescription.isBlank()) {
            throw new BadRequestException("Job description is required for resume optimisation");
        }
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "…";
    }

    public record OptimizationResult(String content, String providerName) {}
}
