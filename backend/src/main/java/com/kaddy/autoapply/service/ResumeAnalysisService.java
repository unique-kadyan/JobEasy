package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.ResumeAnalysisResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.ResumeAnalysis;
import com.kaddy.autoapply.repository.ResumeAnalysisRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ResumeAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(ResumeAnalysisService.class);

    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository analysisRepository;

    public ResumeAnalysisService(ResumeRepository resumeRepository,
                                  ResumeAnalysisRepository analysisRepository) {
        this.resumeRepository = resumeRepository;
        this.analysisRepository = analysisRepository;
    }

    public ResumeAnalysisResponse analyze(String userId) {
        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(r -> Boolean.TRUE.equals(r.getIsPrimary())).findFirst()
                .orElseGet(() -> resumeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                        .stream().findFirst()
                        .orElseThrow(() -> new BadRequestException("No resume found. Please upload a resume first.")));

        String text = Optional.ofNullable(resume.getParsedText()).map(String::toLowerCase).orElse("");
        Map<String, Object> parsed = resume.getParsedData();

        List<String> missing = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();
        List<String> strengths = new ArrayList<>();
        int score = 100;

        // ── Contact information ──────────────────────────────────────────────────
        if (parsed == null || parsed.get("email") == null) {
            missing.add("Email address");
            suggestions.add("Add your professional email address to the contact section.");
            score -= 8;
        } else {
            strengths.add("Email address present");
        }

        if (parsed == null || parsed.get("phone") == null) {
            missing.add("Phone number");
            suggestions.add("Include a phone number with country code for recruiter contact.");
            score -= 5;
        } else {
            strengths.add("Phone number present");
        }

        // ── Professional summary ─────────────────────────────────────────────────
        boolean hasSummary = text.contains("summary") || text.contains("objective") || text.contains("profile");
        if (!hasSummary) {
            missing.add("Professional summary / objective");
            suggestions.add("Add a 2-3 sentence professional summary at the top to grab recruiter attention.");
            score -= 10;
        } else {
            strengths.add("Professional summary found");
        }

        // ── Work experience ──────────────────────────────────────────────────────
        boolean hasExperience = Optional.ofNullable(parsed)
                .map(p -> Boolean.TRUE.equals(p.get("hasExperience"))).orElse(false)
                || text.contains("experience") || text.contains("employment") || text.contains("work history");
        if (!hasExperience) {
            missing.add("Work experience section");
            suggestions.add("Add a detailed work experience section with company names, titles, and date ranges.");
            score -= 15;
        } else {
            strengths.add("Work experience section present");
            if (!containsActionVerbs(text)) {
                suggestions.add("Start bullet points with strong action verbs (e.g., Led, Built, Improved, Reduced).");
                score -= 5;
            }
            if (!containsNumbers(text)) {
                suggestions.add("Quantify achievements with numbers and percentages (e.g., 'Reduced load time by 40%').");
                score -= 5;
            }
        }

        // ── Education ────────────────────────────────────────────────────────────
        boolean hasEducation = Optional.ofNullable(parsed)
                .map(p -> Boolean.TRUE.equals(p.get("hasEducation"))).orElse(false)
                || text.contains("education") || text.contains("university") || text.contains("degree")
                || text.contains("bachelor") || text.contains("master");
        if (!hasEducation) {
            missing.add("Education section");
            suggestions.add("Include your highest education level with institution name and graduation year.");
            score -= 10;
        } else {
            strengths.add("Education section present");
        }

        // ── Skills ───────────────────────────────────────────────────────────────
        boolean hasSkills = Optional.ofNullable(parsed)
                .map(p -> p.get("skills") instanceof List<?> l && !l.isEmpty()).orElse(false);
        if (!hasSkills) {
            missing.add("Skills section");
            suggestions.add("Add a dedicated skills section listing technical and soft skills relevant to your target role.");
            score -= 10;
        } else {
            strengths.add("Skills section present");
        }

        // ── Projects ─────────────────────────────────────────────────────────────
        boolean hasProjects = Optional.ofNullable(parsed)
                .map(p -> Boolean.TRUE.equals(p.get("hasProjects"))).orElse(false)
                || text.contains("project") || text.contains("portfolio");
        if (!hasProjects) {
            suggestions.add("Consider adding a projects section to demonstrate hands-on experience.");
            score -= 5;
        } else {
            strengths.add("Projects section found");
        }

        // ── Certifications ───────────────────────────────────────────────────────
        boolean hasCerts = Optional.ofNullable(parsed)
                .map(p -> Boolean.TRUE.equals(p.get("hasCertifications"))).orElse(false)
                || text.contains("certif") || text.contains("aws") || text.contains("google cloud");
        if (!hasCerts) {
            suggestions.add("Add any relevant certifications to strengthen your application.");
        } else {
            strengths.add("Certifications listed");
        }

        // ── LinkedIn URL ─────────────────────────────────────────────────────────
        if (!text.contains("linkedin")) {
            suggestions.add("Include your LinkedIn profile URL for recruiter verification.");
            score -= 3;
        } else {
            strengths.add("LinkedIn profile linked");
        }

        // ── Resume length ────────────────────────────────────────────────────────
        int wordCount = Optional.ofNullable(parsed)
                .flatMap(p -> Optional.ofNullable(p.get("wordCount")))
                .filter(Integer.class::isInstance).map(Integer.class::cast)
                .orElseGet(() -> countWords(text));
        String lengthAssessment;
        if (wordCount < 300) {
            lengthAssessment = "Too short — add more detail to experience and skills sections.";
            score -= 10;
        } else if (wordCount > 900) {
            lengthAssessment = "Too long — trim to 1-2 pages for optimal ATS and recruiter readability.";
            score -= 7;
        } else {
            lengthAssessment = "Good length (" + wordCount + " words) — concise and complete.";
            strengths.add("Optimal resume length");
        }

        score = Math.max(0, score);

        // Persist
        ResumeAnalysis entity = new ResumeAnalysis();
        entity.setUserId(userId);
        entity.setResumeId(resume.getId());
        entity.setAtsScore(score);
        entity.setMissingFields(missing);
        entity.setSuggestions(suggestions);
        entity.setStrengths(strengths);
        entity.setLengthAssessment(lengthAssessment);
        entity.setWordCount(wordCount);
        ResumeAnalysis saved = analysisRepository.save(entity);

        log.info("ATS analysis for user {} scored {}", userId, score);

        return new ResumeAnalysisResponse(
                saved.getId(), score, scoreLabel(score),
                missing, suggestions, strengths, lengthAssessment, wordCount);
    }

    // ── helpers ──────────────────────────────────────────────────────────────────

    private boolean containsActionVerbs(String text) {
        String[] verbs = {"led", "built", "developed", "designed", "implemented", "improved",
                "reduced", "increased", "managed", "created", "delivered", "achieved",
                "launched", "optimized", "automated", "collaborated"};
        for (String v : verbs) if (text.contains(v)) return true;
        return false;
    }

    private boolean containsNumbers(String text) {
        return text.matches(".*\\d+%.*") || text.matches(".*\\$\\d+.*") || text.matches(".*\\d+x.*")
                || text.matches(".*[0-9]+ (users|customers|engineers|team|projects|systems).*");
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().split("\\s+").length;
    }

    private String scoreLabel(int score) {
        if (score >= 85) return "Excellent";
        if (score >= 70) return "Good";
        if (score >= 50) return "Fair";
        return "Needs Work";
    }
}
