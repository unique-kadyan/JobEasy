package com.kaddy.autoapply.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.dto.response.GeneratedResumeResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.GeneratedResume;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.GeneratedResumeRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResumeGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(ResumeGeneratorService.class);

    private static final String SYSTEM_PROMPT = """
            You are an expert professional resume writer and ATS optimization specialist.
            Generate a complete, professionally formatted resume as a JSON object.
            Rules:
            - Use strong action verbs to start all bullet points
            - Quantify achievements with numbers/percentages wherever possible
            - Keep the resume concise: 1 page for <5 years experience, 2 pages max otherwise
            - Make every section ATS-friendly with relevant keywords
            - Do NOT invent facts — only use information provided
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

        // Estimate ATS score from generated content
        int atsScore = estimateScore(resumeData);

        GeneratedResume entity = new GeneratedResume();
        entity.setUserId(userId);
        entity.setSourceResumeId(resume.getId());
        entity.setResumeData(resumeData);
        entity.setAtsScore(atsScore);
        GeneratedResume saved = generatedResumeRepository.save(entity);

        return toResponse(saved, false);
    }

    public GeneratedResumeResponse getLatest(String userId) {
        GeneratedResume gr = generatedResumeRepository
                .findTopByUserIdOrderByGeneratedAtDesc(userId)
                .orElseThrow(() -> new BadRequestException("No generated resume found. Please generate one first."));
        return toResponse(gr, gr.isPaid());
    }

    public GeneratedResumeResponse getFull(String id, String userId) {
        GeneratedResume gr = generatedResumeRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Generated resume not found."));
        if (!gr.getUserId().equals(userId)) {
            throw new BadRequestException("Access denied.");
        }
        if (!gr.isPaid()) {
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
                  "skills": {"technical":[],"soft":[],"languages":[]},
                  "projects": [{"name":"","description":"","technologies":[],"url":""}],
                  "certifications": [{"name":"","issuer":"","date":""}]
                }
                """);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
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
        } catch (Exception e) {
            log.warn("Failed to parse AI resume JSON, wrapping raw: {}", e.getMessage());
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("raw", raw);
            fallback.put("parseError", true);
            return fallback;
        }
    }

    private int estimateScore(Map<String, Object> data) {
        int score = 60;
        if (data.get("summary") instanceof String s && !s.isBlank()) score += 10;
        if (data.get("experience") instanceof List<?> l && !l.isEmpty()) score += 15;
        if (data.get("education") instanceof List<?> l && !l.isEmpty()) score += 8;
        if (data.get("skills") instanceof Map<?, ?> m
                && m.get("technical") instanceof List<?> l && !l.isEmpty()) score += 7;
        return Math.min(score, 98);
    }

    private GeneratedResumeResponse toResponse(GeneratedResume gr, boolean fullAccess) {
        Map<String, Object> preview = buildPreview(gr.getResumeData());
        Map<String, Object> responseData = fullAccess ? gr.getResumeData() : null;
        return new GeneratedResumeResponse(
                gr.getId(), responseData, preview, gr.getAtsScore(), gr.isPaid(), gr.getGeneratedAt());
    }

    private Map<String, Object> buildPreview(Map<String, Object> data) {
        if (data == null) return Map.of();
        Map<String, Object> preview = new HashMap<>();
        preview.put("name", data.get("name"));
        preview.put("contact", data.get("contact"));
        preview.put("summary", data.get("summary"));
        // First 2 experience entries only
        if (data.get("experience") instanceof List<?> exp) {
            preview.put("experience", exp.subList(0, Math.min(2, exp.size())));
        }
        preview.put("skills", data.get("skills"));
        return preview;
    }

    private String nvl(String s) {
        return s != null ? s : "";
    }
}
