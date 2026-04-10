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
import com.kaddy.autoapply.repository.GeneratedResumeRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(ResumeGeneratorService.class);

    private static final String ATS_SCORING_SYSTEM = """
            You are an ATS (Applicant Tracking System) evaluation engine used by enterprise recruiters.
            Score the provided resume JSON strictly against real ATS criteria.
            Be critical and accurate — do NOT give full marks unless the criterion is truly excellent.

            Scoring criteria (total = 100):
            1. contactInfo (0-10): Has email, phone, location, LinkedIn, GitHub. Deduct 2 per missing field.
            2. summary (0-15): Present, 2-4 sentences, uses industry keywords, states years of experience and specialization.
            3. experience (0-30): Each role has 4+ bullets, starts with action verbs, quantifies achievements (numbers/%, scale). Deduct for vague bullets.
            4. skills (0-20): Comprehensive technical skills list covering languages, frameworks, databases, cloud, tools. Deduct for missing categories.
            5. education (0-10): Has institution, degree, field, graduation date.
            6. formatting (0-5): Standard section headings (EXPERIENCE, EDUCATION, SKILLS), no tables, no images, parseable structure.
            7. keywords (0-10): Job-relevant industry keywords appear naturally in summary and experience bullets.

            Return ONLY this JSON (no markdown, no explanation):
            {"score":0,"breakdown":{"contactInfo":0,"summary":0,"experience":0,"skills":0,"education":0,"formatting":0,"keywords":0},"weaknesses":["..."]}
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
    private final ObjectMapper objectMapper;

    public ResumeGeneratorService(UserRepository userRepository,
                                   ResumeRepository resumeRepository,
                                   GeneratedResumeRepository generatedResumeRepository,
                                   AiProviderFactory aiProviderFactory,
                                   ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
        this.generatedResumeRepository = generatedResumeRepository;
        this.aiProviderFactory = aiProviderFactory;
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

        AiProviderFactory.GenerationResult result = aiProviderFactory.generate(SYSTEM_PROMPT, userPrompt, null);
        log.info("Resume generated for user {} using {}", userId, result.providerName());

        Map<String, Object> resumeData = parseResumeJson(result.content());

        // Calculate ATS score using AI evaluation
        int atsScore = calculateAtsScore(resumeData);

        GeneratedResume entity = new GeneratedResume();
        entity.setUserId(userId);
        entity.setSourceResumeId(resume.getId());
        entity.setResumeData(resumeData);
        entity.setAtsScore(atsScore);
        if (SecurityUtils.isAdmin()) entity.setPaid(true); // admins get full access for free
        GeneratedResume saved = generatedResumeRepository.save(entity);

        return toResponse(saved, SecurityUtils.isAdmin());
    }

    public GeneratedResumeResponse getLatest(String userId) {
        GeneratedResume gr = generatedResumeRepository
                .findTopByUserIdOrderByGeneratedAtDesc(userId)
                .orElseThrow(() -> new BadRequestException("No generated resume found. Please generate one first."));
        return toResponse(gr, gr.isPaid() || SecurityUtils.isAdmin());
    }

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

    // ── helpers ──────────────────────────────────────────────────────────────────

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
        sb.append("""
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
            // Strip markdown code fences if present
            if (json.startsWith("```")) {
                int start = json.indexOf('{');
                int end = json.lastIndexOf('}');
                if (start >= 0 && end > start) json = json.substring(start, end + 1);
            }
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse AI resume JSON, wrapping raw: {}", e.getMessage());
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("raw", raw);
            fallback.put("parseError", true);
            return fallback;
        }
    }

    private int calculateAtsScore(Map<String, Object> resumeData) {
        try {
            String resumeJson = objectMapper.writeValueAsString(resumeData);
            String userPrompt = "Evaluate this resume JSON for ATS compatibility:\n\n" + resumeJson;
            AiProviderFactory.GenerationResult result =
                    aiProviderFactory.generate(ATS_SCORING_SYSTEM, userPrompt, null);

            String raw = result.content().trim();
            if (raw.startsWith("```")) {
                int start = raw.indexOf('{');
                int end   = raw.lastIndexOf('}');
                if (start >= 0 && end > start) raw = raw.substring(start, end + 1);
            }
            Map<String, Object> scored = objectMapper.readValue(raw, new TypeReference<>() {});
            Object scoreVal = scored.get("score");
            if (scoreVal instanceof Number n) return Math.min(100, Math.max(0, n.intValue()));
        } catch (Exception e) {
            log.warn("ATS scoring AI call failed, falling back to heuristic: {}", e.getMessage());
        }
        // Fallback heuristic if AI call fails
        int score = 60;
        if (resumeData.get("summary") instanceof String s && !s.isBlank()) score += 10;
        if (resumeData.get("experience") instanceof List<?> l && !l.isEmpty()) score += 15;
        if (resumeData.get("education") instanceof List<?> l && !l.isEmpty()) score += 8;
        if (resumeData.get("skills") instanceof Map<?, ?> m
                && m.get("technical") instanceof List<?> l && !l.isEmpty()) score += 7;
        return score;
    }

    private GeneratedResumeResponse toResponse(GeneratedResume gr, boolean fullAccess) {
        Map<String, Object> preview = buildPreview(gr.getResumeData());
        Map<String, Object> responseData = fullAccess ? gr.getResumeData() : null;
        return new GeneratedResumeResponse(
                gr.getId(), responseData, preview, gr.getAtsScore(), gr.isPaid(), gr.getGeneratedAt());
    }

    private Map<String, Object> buildPreview(Map<String, Object> data) {
        return Optional.ofNullable(data).map(d -> {
            Map<String, Object> preview = new HashMap<>();
            preview.put("name", d.get("name"));
            preview.put("contact", d.get("contact"));
            preview.put("summary", d.get("summary"));
            if (d.get("experience") instanceof List<?> exp) {
                preview.put("experience", exp.subList(0, Math.min(2, exp.size())));
            }
            preview.put("skills", d.get("skills"));
            return preview;
        }).orElseGet(Map::of);
    }

    private String nvl(String s) {
        return Optional.ofNullable(s).orElse("");
    }
}
