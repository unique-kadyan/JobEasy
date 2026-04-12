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

import java.time.Duration;
import java.time.Instant;
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

    private static final int MAX_REFINEMENT_PASSES = 5;
    private static final int TARGET_ATS_SCORE = 100;
    /** Max wall-clock time the entire generate() call (including refinement) may take. */
    private static final Duration MAX_GENERATION_TIME = Duration.ofSeconds(120);

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
            You are an expert ATS resume optimizer targeting a perfect 100/100 score.
            You will receive a resume JSON and the specific weaknesses an ATS engine identified.
            Fix EVERY weakness. The final resume MUST satisfy every criterion below completely.

            Scoring rubric — every point must be earned:
            1. contactInfo (10 pts): email, phone, location, linkedin, github — ALL 5 present and non-blank (2 pts each).
            2. summary (15 pts): exactly 2–4 sentences. MUST state years of experience as a number, state the specialization,
               and include ≥5 distinct industry keywords (e.g. "distributed systems", "microservices", "99.9% uptime").
            3. experience (30 pts): each role needs ≥4 bullets. EVERY bullet MUST:
               a) Start with a strong action verb (Led, Built, Designed, Reduced, Implemented, Scaled, Delivered…)
               b) Contain at least one concrete metric (%, $, multiplier like 3x, count of users/systems/requests,
                  or a time measure). If the exact number is unknown, use a plausible estimate ("~40%", "3–5x").
               No bullet scores points without BOTH (a) and (b). Cap at 30 pts total across all roles.
            4. skills (20 pts): all 7 categories non-empty — technical, frameworks, databases, cloud, tools, soft, languages.
               3 pts per non-empty category, cap 20. Extract every technology from the resume context; do NOT leave any empty.
            5. education (10 pts): institution + degree + field + graduationDate all present and non-blank.
               Infer missing fields from context if needed.
            6. formatting (5 pts): contact, summary, experience, skills, education all present in the JSON.
            7. keywords (10 pts): ≥8 distinct industry keywords (word length >4) spread across summary + experience bullets.

            Additional rules:
            - Preserve ALL existing factual data — only enhance phrasing and add quantification.
            - Do NOT blank out or remove any existing contact field.
            - Return ONLY valid JSON in the exact same structure as the input. No markdown, no explanation.
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
        // Fix #2: fail fast on unparseable AI output instead of saving corrupt data
        if (Boolean.TRUE.equals(resumeData.get("parseError"))) {
            log.error("AI resume generation returned unparseable JSON for user {} — aborting", userId);
            throw new BadRequestException("AI returned malformed JSON. Please retry.");
        }

        // Multi-pass refinement loop: keep improving until score >= TARGET_ATS_SCORE or budget exhausted
        Instant deadline = Instant.now().plus(MAX_GENERATION_TIME);
        AtsEvaluation evaluation = scoreResume(resumeData);
        log.info("Initial ATS score {} for user {}", evaluation.score(), userId);

        int pass = 0;
        while (evaluation.score() < TARGET_ATS_SCORE
                && !evaluation.weaknesses().isEmpty()
                && pass < MAX_REFINEMENT_PASSES
                && Instant.now().isBefore(deadline)) {
            pass++;
            log.info("ATS score {} (pass {}/{}) for user {} — refining weaknesses: {}",
                    evaluation.score(), pass, MAX_REFINEMENT_PASSES, userId, evaluation.weaknesses());
            Map<String, Object> refined = refineResume(resumeData, evaluation.weaknesses(), pass);
            if (refined.isEmpty()) {
                log.warn("Refinement pass {} returned empty — keeping best result so far (score={})", pass, evaluation.score());
                break;
            }
            resumeData = refined;
            evaluation = scoreResume(resumeData);
        }
        if (!Instant.now().isBefore(deadline)) {
            log.warn("Generation time budget exhausted for user {} after {} passes — returning best result (score={})",
                    userId, pass, evaluation.score());
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
            // AI score is authoritative — local scorer is used ONLY when the AI response
            // omits the "score" field entirely (parse succeeded but field missing).
            int score = (scored.get("score") instanceof Number n)
                    ? Math.min(100, Math.max(0, n.intValue()))
                    : computeLocalScore(resumeData);
            @SuppressWarnings("unchecked")
            List<String> aiWeaknesses = scored.get("weaknesses") instanceof List<?> w
                    ? (List<String>) w : List.of();
            // If the AI returned no weaknesses but score is below target, fall back to
            // structural weakness detection so the refinement loop has something to work with.
            List<String> weaknesses = aiWeaknesses.isEmpty() && score < TARGET_ATS_SCORE
                    ? deriveWeaknesses(resumeData, score) : aiWeaknesses;
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
     * Structural ATS score used ONLY as fallback when all AI providers are unavailable.
     * Checks field presence and counts — content quality is assessed by the AI scorer.
     *
     * contactInfo  0-10  (2 pts per present field)
     * summary      0-15  (15 if 2+ sentences, 8 if 1 sentence)
     * experience   0-30  (6 per role with ≥4 bullets, 3 with any bullets; cap 30)
     * skills       0-20  (3 per non-empty category; cap 20)
     * education    0-10  (10 all 4 fields, 5 partial)
     * formatting   0-5   (1 per core section present)
     * keywords     0-10  (distinct word count proxy)
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

        // 3. experience (0-30): bullet count only — quality is for AI to judge
        if (data.get("experience") instanceof List<?> exp) {
            int expScore = 0;
            for (Object roleObj : exp) {
                if (roleObj instanceof Map<?, ?> role && role.get("bullets") instanceof List<?> b) {
                    expScore += b.size() >= 4 ? 6 : !b.isEmpty() ? 3 : 0;
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

        // 6. formatting (0-5)
        long coreSections = Stream.of("contact", "summary", "experience", "skills", "education")
                .filter(k -> data.get(k) != null).count();
        score += (int) Math.min(5, coreSections);

        // 7. keywords (0-10): distinct word proxy
        StringBuilder allText = new StringBuilder();
        if (data.get("summary") instanceof String s) allText.append(s).append(" ");
        if (data.get("experience") instanceof List<?> exp) {
            exp.stream().filter(Map.class::isInstance).map(Map.class::cast).forEach(role -> {
                if (role.get("bullets") instanceof List<?> bullets)
                    bullets.forEach(b -> allText.append(b).append(" "));
            });
        }
        long distinctWords = Arrays.stream(allText.toString().toLowerCase().split("\\W+"))
                .filter(w -> w.length() > 4).distinct().count();
        score += distinctWords >= 8 ? 10 : distinctWords >= 4 ? 6 : (int) Math.min(3, distinctWords);

        return Math.min(100, score);
    }

    /**
     * Derives structural weaknesses when the AI scorer is unavailable.
     * Only checks presence and counts — content quality is for the AI scorer.
     */
    private List<String> deriveWeaknesses(Map<String, Object> data, int score) {
        if (score >= TARGET_ATS_SCORE) return List.of();
        List<String> w = new java.util.ArrayList<>();

        // 1. Contact — list each missing field individually
        if (data.get("contact") instanceof Map<?, ?> contact) {
            List.of("email", "phone", "location", "linkedin", "github").stream()
                    .filter(f -> !(contact.get(f) instanceof String s) || s.isBlank())
                    .forEach(f -> w.add("contact." + f + " is missing or blank"));
        } else {
            w.add("Contact section is missing entirely");
        }

        // 2. Summary
        if (!(data.get("summary") instanceof String s) || s.isBlank()) {
            w.add("Professional summary is missing — add 2-4 sentences with years of experience and keywords");
        } else if (Arrays.stream(s.split("[.!?]+")).filter(p -> !p.isBlank()).count() < 2) {
            w.add("Summary is too short — expand to at least 2 sentences");
        }

        // 3. Experience — bullet count per role
        if (data.get("experience") instanceof List<?> exp) {
            for (Object roleObj : exp) {
                if (roleObj instanceof Map<?, ?> role) {
                    String title = role.get("title") instanceof String t ? t : "unnamed role";
                    int count = role.get("bullets") instanceof List<?> b ? b.size() : 0;
                    if (count < 4)
                        w.add("'" + title + "': needs ≥4 action-verb bullets with quantified metrics (has " + count + ")");
                }
            }
        } else {
            w.add("Work experience section is missing");
        }

        // 4. Skills — flag each empty category
        if (data.get("skills") instanceof Map<?, ?> skills) {
            List.of("technical", "frameworks", "databases", "cloud", "tools", "soft", "languages").stream()
                    .filter(cat -> !(skills.get(cat) instanceof List<?> l && !l.isEmpty()))
                    .forEach(cat -> w.add("skills." + cat + " category is empty"));
        } else {
            w.add("Skills section is missing");
        }

        // 5. Education
        if (data.get("education") instanceof List<?> edu && !edu.isEmpty()
                && edu.get(0) instanceof Map<?, ?> first) {
            Stream.of("institution", "degree", "field", "graduationDate")
                    .filter(f -> !(first.get(f) instanceof String s) || s.isBlank())
                    .forEach(f -> w.add("education." + f + " is missing"));
        } else {
            w.add("Education section is missing");
        }

        // If structure is complete but score is still below target, the gap is content quality.
        // Add explicit quality hints so the refinement loop has actionable direction.
        if (w.isEmpty() && score < TARGET_ATS_SCORE) {
            w.add("Every experience bullet MUST start with a strong action verb (Led, Built, Reduced, Implemented, Scaled…)");
            w.add("Add at least one concrete metric (%, $, multiplier like 3×, user/request count, or time saved) to every bullet");
            w.add("Summary must state years of experience as a number and include ≥5 distinct industry keywords");
            w.add("Spread ≥8 distinct industry keywords (length >4) across summary and experience bullets to maximise keyword score");
            if (score < 80) {
                w.add("Ensure all 7 skills categories are non-empty: technical, frameworks, databases, cloud, tools, soft, languages");
            }
        }

        return w;
    }

    private Map<String, Object> refineResume(Map<String, Object> resumeData, List<String> weaknesses, int pass) {
        try {
            String resumeJson = objectMapper.writeValueAsString(resumeData);
            String userPrompt = "Resume JSON:\n" + resumeJson
                    + "\n\nWeaknesses to fix:\n- " + String.join("\n- ", weaknesses)
                    + "\n\nReturn the improved resume JSON with all weaknesses fixed.";
            AiProviderFactory.GenerationResult result = aiProviderFactory.generate(REFINEMENT_SYSTEM, userPrompt,
                    AiProviderFactory.TaskType.RESUME_GENERATION);
            Map<String, Object> refined = parseResumeJson(result.content());
            if (Boolean.TRUE.equals(refined.get("parseError"))) {
                log.warn("Refinement pass {} returned unparseable JSON — keeping prior result; weaknesses were: {}",
                        pass, weaknesses);
                return Map.of();
            }
            return refined;
        } catch (Exception e) {
            log.warn("Refinement pass {} failed ({}): {} — weaknesses were: {}",
                    pass, e.getClass().getSimpleName(), e.getMessage(), weaknesses);
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
