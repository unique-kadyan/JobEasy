package com.kaddy.autoapply.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.response.GeneratedResumeResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.model.GeneratedResume;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.enums.FeatureType;
import com.kaddy.autoapply.repository.GeneratedResumeRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(ResumeGeneratorService.class);

    private static final int MAX_REFINEMENT_PASSES = 3;
    private static final int TARGET_ATS_SCORE = 95;

    private static final String ATS_SCORING_SYSTEM = """
            You are a strict ATS (Applicant Tracking System) evaluation engine.
            Score the provided resume JSON honestly against each criterion.
            Do NOT award full marks unless the criterion is genuinely excellent.
            Do NOT inflate the score — accuracy is critical.

            Scoring criteria (total = 100 points):
            1. contactInfo  (0-10): email=2, phone=2, location=2, linkedin=2, github=2. Deduct 2 for each missing/blank field.
            2. summary      (0-15): 0 if absent; 6 if 1 sentence; 10 if 2 sentences; 15 if 2-4 sentences with keywords + years of experience stated.
            3. experience   (0-30): 0 if absent. Per role: +6 if has 4+ bullets starting with action verbs AND contains numbers/percentages/scale. +3 if bullets present but lack quantification. Cap 30.
            4. skills       (0-20): 3 pts per non-empty category (technical, frameworks, databases, cloud, tools, soft, languages). Cap 20.
            5. education    (0-10): 0 if absent; 5 if institution only; 10 if institution + degree + field + graduationDate all present.
            6. formatting   (0-5):  5 if all standard sections present (contact, summary, experience, skills, education). Deduct 1 per missing section.
            7. keywords     (0-10): Count distinct industry keywords in summary + experience bullets. 0-3 keywords=3pts; 4-7=6pts; 8+=10pts.

            Weaknesses: list ONLY criteria that scored below their maximum. Be specific — name the exact field or bullet that is weak.

            Return ONLY this JSON (no markdown, no explanation):
            {"score":0,"breakdown":{"contactInfo":0,"summary":0,"experience":0,"skills":0,"education":0,"formatting":0,"keywords":0},"weaknesses":["..."]}
            """;

    private static final String REFINEMENT_SYSTEM = """
            You are an expert ATS resume optimizer. You will receive a resume JSON and a scored list of specific
            weaknesses from an ATS engine. Fix EVERY weakness to push the resume to 100/100.

            Rules — apply ALL without exception:
            - Every experience bullet MUST start with a strong action verb (Led, Built, Designed, Reduced, Improved…)
            - Every experience bullet MUST contain at least one quantified metric (%, $, x, number of users/systems/team members)
            - If a metric cannot be derived from context, use a plausible range (e.g. "~30%" or "3-5x")
            - Summary MUST be 2-4 sentences: state years of experience, specialization, and 3+ industry keywords
            - Skills MUST cover all categories: technical, frameworks, databases, cloud, tools, soft, languages — fill missing ones from context
            - Contact MUST include email, phone, location, linkedin, github — keep existing values, do NOT blank them out
            - Education MUST have institution, degree, field, graduationDate — infer from context if partial
            - Preserve ALL existing factual data — only enhance phrasing and add quantification
            - Return ONLY valid JSON in the exact same structure as the input resume JSON, no markdown, no explanation
            """;

    private static final String SYSTEM_PROMPT = """
            You are an expert professional resume writer and ATS optimization specialist.
            Generate a complete, professionally formatted resume as a JSON object.
            Rules:
            - Use strong action verbs to start ALL bullet points (Led, Built, Designed, Implemented, Reduced, Improved...)
            - Quantify EVERY achievement with numbers, percentages, scale, or time wherever possible
            - Keep the resume concise: 1 page for <5 years experience, 2 pages max otherwise
            - Skills section MUST be comprehensive: extract every technology, framework, tool, language, platform, and methodology mentioned in the resume — do NOT truncate. Group into: technical, soft, languages, tools, platforms
            - Include ALL relevant industry keywords naturally in the summary and experience bullets for maximum ATS keyword density
            - Mirror exact job-relevant terminology from the provided resume content
            - Do NOT invent facts — only use information provided, but rephrase powerfully
            - Every experience bullet must demonstrate impact, not just responsibility
            - Return ONLY valid JSON, no markdown, no explanation
            """;

    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final GeneratedResumeRepository generatedResumeRepository;
    private final AiProviderFactory aiProviderFactory;
    private final FeatureUsageService featureUsageService;
    private final ObjectMapper objectMapper;

    public ResumeGeneratorService(UserRepository userRepository,
            ResumeRepository resumeRepository,
            GeneratedResumeRepository generatedResumeRepository,
            AiProviderFactory aiProviderFactory,
            FeatureUsageService featureUsageService,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
        this.generatedResumeRepository = generatedResumeRepository;
        this.aiProviderFactory = aiProviderFactory;
        this.featureUsageService = featureUsageService;
        this.objectMapper = objectMapper;
    }

    public GeneratedResumeResponse generate(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found."));

        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(r -> Boolean.TRUE.equals(r.getIsPrimary())).findFirst()
                .orElseGet(() -> resumeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                        .stream().findFirst()
                        .orElseThrow(() -> new BadRequestException("No resume found. Please upload a resume first.")));

        String userPrompt = buildPrompt(user, resume);

        AiProviderFactory.GenerationResult result = aiProviderFactory.generate(
                SYSTEM_PROMPT, userPrompt, AiProviderFactory.TaskType.RESUME_GENERATION);
        log.info("Resume generated for user {} using {}", userId, result.providerName());

        Map<String, Object> resumeData = parseResumeJson(result.content());

        // Multi-pass refinement loop: keep improving until score >= TARGET_ATS_SCORE or max passes reached
        AtsEvaluation evaluation = scoreResume(resumeData);
        log.info("Initial ATS score {} for user {}", evaluation.score(), userId);

        int pass = 0;
        while (evaluation.score() < TARGET_ATS_SCORE
                && !evaluation.weaknesses().isEmpty()
                && pass < MAX_REFINEMENT_PASSES) {
            pass++;
            log.info("ATS score {} (pass {}/{}) for user {} — refining weaknesses: {}",
                    evaluation.score(), pass, MAX_REFINEMENT_PASSES, userId, evaluation.weaknesses());
            Map<String, Object> refined = refineResume(resumeData, evaluation.weaknesses());
            if (refined.isEmpty()) {
                log.warn("Refinement pass {} returned empty — keeping best result so far", pass);
                break;
            }
            resumeData = refined;
            evaluation = scoreResume(resumeData);
        }

        int atsScore = evaluation.score();
        log.info("Final ATS score {} for user {} after {} refinement pass(es)", atsScore, userId, pass);

        GeneratedResume entity = new GeneratedResume();
        entity.setUserId(userId);
        entity.setSourceResumeId(resume.getId());
        entity.setResumeData(resumeData);
        entity.setAtsScore(atsScore);
        if (SecurityUtils.isAdmin())
            entity.setPaid(true);
        GeneratedResume saved = generatedResumeRepository.save(entity);
        featureUsageService.record(userId, FeatureType.SMART_RESUME_GENERATED, saved.getId());

        return toResponse(saved, SecurityUtils.isAdmin());
    }

    @Transactional(readOnly = true)
    public GeneratedResumeResponse getLatest(String userId) {
        GeneratedResume gr = generatedResumeRepository
                .findTopByUserIdOrderByGeneratedAtDesc(userId)
                .orElseThrow(() -> new BadRequestException("No generated resume found. Please generate one first."));
        return toResponse(gr, gr.isPaid() || SecurityUtils.isAdmin());
    }

    @Transactional(readOnly = true)
    public GeneratedResumeResponse getFull(String id, String userId) {
        GeneratedResume gr = generatedResumeRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Generated resume not found."));
        if (!gr.getUserId().equals(userId) && !SecurityUtils.isAdmin()) {
            throw new BadRequestException("Access denied.");
        }
        if (!gr.isPaid() && !SecurityUtils.isAdmin()) {
            throw new BadRequestException("Payment required to access the full resume.");
        }
        return toResponse(gr, true);
    }

    private String buildPrompt(User user, Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("Generate a professional resume JSON for the following person:\n\n");
        sb.append("NAME: ").append(nvl(user.getName())).append("\n");
        sb.append("EMAIL: ").append(nvl(user.getEmail())).append("\n");
        sb.append("PHONE: ").append(nvl(user.getPhone())).append("\n");
        sb.append("LOCATION: ").append(nvl(user.getLocation())).append("\n");
        sb.append("TITLE: ").append(nvl(user.getTitle())).append("\n");
        sb.append("LINKEDIN: ").append(nvl(user.getLinkedinUrl())).append("\n");
        sb.append("GITHUB: ").append(nvl(user.getGithubUrl())).append("\n");
        sb.append("PORTFOLIO: ").append(nvl(user.getPortfolioUrl())).append("\n");
        if (user.getSummary() != null) {
            sb.append("CURRENT SUMMARY: ").append(user.getSummary()).append("\n");
        }
        sb.append("\nRESUME CONTENT:\n").append(nvl(resume.getParsedText())).append("\n\n");
        sb.append(
                """
                        Return ONLY this JSON structure (no markdown, no extra text):
                        {
                          "name": "",
                          "contact": {"email":"","phone":"","location":"","linkedin":"","github":"","portfolio":""},
                          "summary": "2-3 sentence professional summary",
                          "experience": [{"company":"","title":"","location":"","startDate":"","endDate":"","current":false,"bullets":[]}],
                          "education": [{"institution":"","degree":"","field":"","graduationDate":"","gpa":""}],
                          "skills": {"technical":[],"frameworks":[],"databases":[],"cloud":[],"tools":[],"soft":[],"languages":[]},
                          "projects": [{"name":"","description":"","technologies":[],"url":""}],
                          "certifications": [{"name":"","issuer":"","date":""}]
                        }
                        """);
        return sb.toString();
    }

    private Map<String, Object> parseResumeJson(String raw) {
        try {
            String json = raw.trim();

            if (json.startsWith("```")) {
                int start = json.indexOf('{');
                int end = json.lastIndexOf('}');
                if (start >= 0 && end > start)
                    json = json.substring(start, end + 1);
            }
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse AI resume JSON, wrapping raw: {}", e.getMessage());
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("raw", raw);
            fallback.put("parseError", true);
            return fallback;
        }
    }

    private record AtsEvaluation(int score, List<String> weaknesses) {
    }

    private AtsEvaluation scoreResume(Map<String, Object> resumeData) {
        try {
            String resumeJson = objectMapper.writeValueAsString(resumeData);
            String userPrompt = "Evaluate this resume JSON for ATS compatibility:\n\n" + resumeJson;
            AiProviderFactory.GenerationResult result = aiProviderFactory.generate(ATS_SCORING_SYSTEM, userPrompt,
                    AiProviderFactory.TaskType.REASONING);

            String raw = result.content().trim();
            if (raw.startsWith("```")) {
                int start = raw.indexOf('{');
                int end = raw.lastIndexOf('}');
                if (start >= 0 && end > start)
                    raw = raw.substring(start, end + 1);
            }
            Map<String, Object> scored = objectMapper.readValue(raw, new TypeReference<>() {});
            int score = computeLocalScore(resumeData); // use structural score as baseline
            if (scored.get("score") instanceof Number n)
                score = Math.min(100, Math.max(0, n.intValue()));
            @SuppressWarnings("unchecked")
            List<String> weaknesses = scored.get("weaknesses") instanceof List<?> w
                    ? (List<String>) w
                    : List.of();
            return new AtsEvaluation(score, weaknesses);
        } catch (Exception e) {
            log.warn("ATS scoring AI call failed — falling back to structural score: {}", e.getMessage());
            // Fallback: compute score from the actual resume JSON structure (no hardcodes)
            int structuralScore = computeLocalScore(resumeData);
            List<String> derivedWeaknesses = deriveWeaknesses(resumeData, structuralScore);
            return new AtsEvaluation(structuralScore, derivedWeaknesses);
        }
    }

    /**
     * Deterministic structural ATS score computed directly from the resume JSON.
     * Mirrors the same criteria as ATS_SCORING_SYSTEM — no hardcoded values.
     *
     * <pre>
     * contactInfo  0-10  (email/phone/location/linkedin/github = 2 pts each)
     * summary      0-15  (2-4 sentences with keywords = 15, 1 sentence = 8, absent = 0)
     * experience   0-30  (per role: +6 if has 4+ bullets, +3 if any bullets, cap 30)
     * skills       0-20  (3 pts per non-empty category, cap 20)
     * education    0-10  (all 4 fields present = 10, partial = 5, absent = 0)
     * formatting   0-5   (5 if all core sections present)
     * keywords     0-10  (distinct word count in summary+bullets proxy)
     * </pre>
     */
    private int computeLocalScore(Map<String, Object> data) {
        if (data == null) return 0;
        int score = 0;

        // 1. contactInfo (0-10)
        if (data.get("contact") instanceof Map<?, ?> contact) {
            for (String field : List.of("email", "phone", "location", "linkedin", "github")) {
                if (contact.get(field) instanceof String s && !s.isBlank()) score += 2;
            }
        }

        // 2. summary (0-15)
        if (data.get("summary") instanceof String s && !s.isBlank()) {
            long sentences = Arrays.stream(s.split("[.!?]+")).filter(p -> !p.isBlank()).count();
            score += sentences >= 2 ? 15 : 8;
        }

        // 3. experience (0-30)
        if (data.get("experience") instanceof List<?> exp) {
            int expScore = 0;
            for (Object roleObj : exp) {
                if (roleObj instanceof Map<?, ?> role) {
                    boolean hasBullets = role.get("bullets") instanceof List<?> b && b.size() >= 4;
                    expScore += hasBullets ? 6 : (role.get("bullets") instanceof List<?> b2 && !b2.isEmpty() ? 3 : 0);
                }
            }
            score += Math.min(30, expScore);
        }

        // 4. skills (0-20)
        if (data.get("skills") instanceof Map<?, ?> skills) {
            long filled = skills.values().stream()
                    .filter(v -> v instanceof List<?> l && !l.isEmpty()).count();
            score += (int) Math.min(20, filled * 3);
        }

        // 5. education (0-10)
        if (data.get("education") instanceof List<?> edu && !edu.isEmpty()
                && edu.get(0) instanceof Map<?, ?> first) {
            boolean allFields = Stream.of("institution", "degree", "field", "graduationDate")
                    .allMatch(f -> first.get(f) instanceof String s && !s.isBlank());
            score += allFields ? 10 : 5;
        }

        // 6. formatting (0-5): all core sections present in the JSON
        long coreSections = Stream.of("contact", "summary", "experience", "skills", "education")
                .filter(k -> data.get(k) != null).count();
        score += (int) Math.min(5, coreSections);

        // 7. keywords (0-10): distinct non-trivial words in summary + experience bullets
        StringBuilder allText = new StringBuilder();
        if (data.get("summary") instanceof String s) allText.append(s).append(" ");
        if (data.get("experience") instanceof List<?> exp) {
            exp.stream().filter(Map.class::isInstance).map(Map.class::cast).forEach(role -> {
                if (role.get("bullets") instanceof List<?> bullets) {
                    bullets.forEach(b -> allText.append(b).append(" "));
                }
            });
        }
        long distinctWords = Arrays.stream(allText.toString().toLowerCase().split("\\W+"))
                .filter(w -> w.length() > 4).distinct().count();
        score += distinctWords >= 8 ? 10 : distinctWords >= 4 ? 6 : (int) Math.min(3, distinctWords);

        return Math.min(100, score);
    }

    /**
     * Derives actionable weaknesses from the structural score — used when the AI scorer is unavailable.
     */
    private List<String> deriveWeaknesses(Map<String, Object> data, int score) {
        if (score >= TARGET_ATS_SCORE) return List.of();
        List<String> w = new java.util.ArrayList<>();
        if (!(data.get("contact") instanceof Map<?, ?> contact)
                || List.of("email", "phone", "location", "linkedin", "github").stream()
                    .anyMatch(f -> !(contact.get(f) instanceof String s) || s.isBlank())) {
            w.add("Contact section is missing one or more fields: email, phone, location, linkedin, github");
        }
        if (!(data.get("summary") instanceof String s) || s.isBlank()) {
            w.add("Professional summary is missing — add 2-4 sentences with years of experience and industry keywords");
        } else if (Arrays.stream(s.split("[.!?]+")).filter(p -> !p.isBlank()).count() < 2) {
            w.add("Summary is too short — expand to 2-4 sentences with specialization and industry keywords");
        }
        if (data.get("experience") instanceof List<?> exp) {
            for (Object roleObj : exp) {
                if (roleObj instanceof Map<?, ?> role) {
                    List<?> bullets = role.get("bullets") instanceof List<?> b ? b : List.of();
                    if (bullets.size() < 4) w.add("Role '" + role.get("title") + "' needs 4+ action-verb bullets with quantified achievements");
                }
            }
        } else {
            w.add("Work experience section is missing");
        }
        if (!(data.get("skills") instanceof Map<?, ?> skills)
                || skills.values().stream().noneMatch(v -> v instanceof List<?> l && !l.isEmpty())) {
            w.add("Skills section is missing or empty — add technical, frameworks, databases, cloud, tools, soft, languages categories");
        }
        if (!(data.get("education") instanceof List<?> edu) || edu.isEmpty()) {
            w.add("Education section is missing");
        }
        return w;
    }

    private Map<String, Object> refineResume(Map<String, Object> resumeData, List<String> weaknesses) {
        try {
            String resumeJson = objectMapper.writeValueAsString(resumeData);
            String userPrompt = "Resume JSON:\n" + resumeJson
                    + "\n\nWeaknesses to fix:\n- " + String.join("\n- ", weaknesses)
                    + "\n\nReturn the improved resume JSON with all weaknesses fixed.";
            AiProviderFactory.GenerationResult result = aiProviderFactory.generate(REFINEMENT_SYSTEM, userPrompt,
                    AiProviderFactory.TaskType.RESUME_GENERATION);
            return parseResumeJson(result.content());
        } catch (Exception e) {
            log.warn("Resume refinement failed, using original: {}", e.getMessage());
            return Map.of();
        }
    }

    private GeneratedResumeResponse toResponse(GeneratedResume gr, boolean fullAccess) {
        Map<String, Object> preview = buildPreview(gr.getResumeData());
        Map<String, Object> responseData = fullAccess ? gr.getResumeData() : null;
        return new GeneratedResumeResponse(
                gr.getId(), responseData, preview, gr.getAtsScore(), gr.isPaid(), gr.getGeneratedAt());
    }

    private Map<String, Object> buildPreview(Map<String, Object> data) {
        if (data == null) return Map.of();
        Map<String, Object> preview = new java.util.LinkedHashMap<>();
        preview.put("name", data.get("name"));
        preview.put("contact", data.get("contact"));
        preview.put("summary", data.get("summary"));
        if (data.get("experience") instanceof List<?> exp) {
            preview.put("experience", exp.subList(0, Math.min(2, exp.size())));
        }
        preview.put("skills", data.get("skills"));
        return preview;
    }

    private String nvl(String s) {
        return Optional.ofNullable(s).orElse("");
    }
}
