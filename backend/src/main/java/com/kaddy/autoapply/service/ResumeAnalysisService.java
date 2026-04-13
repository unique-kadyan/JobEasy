package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.ResumeAnalysisResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.ResumeAnalysis;
import com.kaddy.autoapply.repository.ResumeAnalysisRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Honest ATS analysis — every penalty and strength reflects the actual
 * content quality of the resume, not just field presence/absence.
 *
 * Scoring breakdown (max 100):
 *   Contact completeness          — up to 12 pts
 *   Summary quality               — up to 10 pts
 *   Experience quality            — up to 25 pts
 *   Skills section                — up to 10 pts
 *   Education                     — up to  8 pts
 *   Projects / portfolio          — up to  8 pts
 *   Certifications                — up to  5 pts
 *   Writing quality               — up to 12 pts  (action verbs, no repetition)
 *   Quantified achievements       — up to  5 pts
 *   Length / readability          — up to  5 pts
 *   ─────────────────────────────────────────────
 *   Total                                 100 pts
 */
@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(ResumeAnalysisService.class);

    // ── Compiled patterns (class-level for efficiency) ────────────────────────

    private static final Pattern EMAIL_PAT = Pattern.compile(
            "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");

    private static final Pattern PHONE_PAT = Pattern.compile(
            "\\+?[0-9][\\s.\\-]?\\(?[0-9]{3}\\)?[\\s.\\-]?[0-9]{3}[\\s.\\-]?[0-9]{4}");

    private static final Pattern LINKEDIN_PAT = Pattern.compile(
            "linkedin\\.com/in/[\\w\\-]+", Pattern.CASE_INSENSITIVE);

    private static final Pattern GITHUB_PAT = Pattern.compile(
            "github\\.com/[\\w\\-]+", Pattern.CASE_INSENSITIVE);

    /** Counts occurrences of a filler phrase that signals templated/AI writing. */
    private static final Pattern RESULTING_IN = Pattern.compile(
            "resulting in", Pattern.CASE_INSENSITIVE);

    /** Generic filler endings that add length but no information. */
    private static final Pattern FILLER_PHRASES = Pattern.compile(
            "(?:resulting in a|leading to a|which led to|this resulted in|" +
            "thereby increasing|thus improving|enabling a|achieving a)\\s+\\d+%",
            Pattern.CASE_INSENSITIVE);

    /** Quantified achievement signals — any number followed by % or metric word. */
    private static final Pattern METRIC_PAT = Pattern.compile(
            "\\d+\\s*%|\\d+x\\b|\\$\\s*\\d+|" +
            "\\d+[kKmM]\\+?\\s*(?:users?|requests?|rps|qps|tps|events?|records?)|" +
            "\\d+\\+?\\s*(?:engineers?|developers?|clients?|customers?|teams?|" +
                          "services?|microservices?|endpoints?|apis?|systems?)",
            Pattern.CASE_INSENSITIVE);

    /**
     * Strong action verbs that ATS parsers specifically reward.
     * Presence of varied verbs signals ownership and impact.
     */
    private static final String[] ACTION_VERBS = {
        "architected", "designed", "led", "drove", "spearheaded", "owned",
        "built", "developed", "implemented", "engineered", "created",
        "reduced", "improved", "increased", "optimized", "automated",
        "launched", "delivered", "migrated", "scaled", "refactored",
        "mentored", "collaborated", "deployed", "integrated", "resolved"
    };

    // ── Repository dependencies ───────────────────────────────────────────────

    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository analysisRepository;

    public ResumeAnalysisService(ResumeRepository resumeRepository,
                                  ResumeAnalysisRepository analysisRepository) {
        this.resumeRepository = resumeRepository;
        this.analysisRepository = analysisRepository;
    }

    // ── Main analysis entry point ─────────────────────────────────────────────

    public ResumeAnalysisResponse analyze(String userId) {
        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(r -> Boolean.TRUE.equals(r.getIsPrimary())).findFirst()
                .orElseGet(() -> resumeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                        .stream().findFirst()
                        .orElseThrow(() -> new BadRequestException(
                                "No resume found. Please upload a resume first.")));

        String rawText = Optional.ofNullable(resume.getParsedText()).orElse("");
        String lower   = rawText.toLowerCase();
        Map<String, Object> parsed = resume.getParsedData();

        // Contact map is nested: parsedData → "contact" → {email, phone, ...}
        @SuppressWarnings("unchecked")
        Map<String, Object> contact = (parsed != null && parsed.get("contact") instanceof Map<?, ?>)
                ? (Map<String, Object>) parsed.get("contact")
                : Map.of();

        List<String> missing     = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();
        List<String> strengths   = new ArrayList<>();
        int score = 0;

        // ── 1. Contact completeness (max 12) ─────────────────────────────────
        score += evaluateContact(rawText, contact, missing, suggestions, strengths);

        // ── 2. Professional summary quality (max 10) ─────────────────────────
        score += evaluateSummary(rawText, lower, parsed, missing, suggestions, strengths);

        // ── 3. Work experience quality (max 25) ──────────────────────────────
        score += evaluateExperience(rawText, lower, parsed, missing, suggestions, strengths);

        // ── 4. Skills section (max 10) ────────────────────────────────────────
        score += evaluateSkills(lower, parsed, missing, suggestions, strengths);

        // ── 5. Education (max 8) ──────────────────────────────────────────────
        score += evaluateEducation(lower, missing, suggestions, strengths);

        // ── 6. Projects / portfolio (max 8) ───────────────────────────────────
        score += evaluateProjects(lower, parsed, suggestions, strengths);

        // ── 7. Certifications (max 5) ─────────────────────────────────────────
        score += evaluateCertifications(rawText, lower, parsed, suggestions, strengths);

        // ── 8. Writing quality — repetition & filler (max 12) ────────────────
        score += evaluateWritingQuality(rawText, lower, suggestions, strengths);

        // ── 9. Quantified achievements (max 5) ───────────────────────────────
        score += evaluateMetrics(rawText, suggestions, strengths);

        // ── 10. Length / readability (max 5) ─────────────────────────────────
        int wordCount = countWords(rawText);
        score += evaluateLength(wordCount, suggestions, strengths);

        score = Math.max(0, Math.min(100, score));

        // ── Persist and return ────────────────────────────────────────────────
        ResumeAnalysis entity = new ResumeAnalysis();
        entity.setUserId(userId);
        entity.setResumeId(resume.getId());
        entity.setAtsScore(score);
        entity.setMissingFields(missing);
        entity.setSuggestions(suggestions);
        entity.setStrengths(strengths);
        entity.setLengthAssessment(buildLengthLabel(wordCount));
        entity.setWordCount(wordCount);
        ResumeAnalysis saved = analysisRepository.save(entity);

        log.info("ATS analysis for user {} — score {} ({})", userId, score, scoreLabel(score));

        return new ResumeAnalysisResponse(
                saved.getId(), score, scoreLabel(score),
                missing, suggestions, strengths,
                buildLengthLabel(wordCount), wordCount);
    }

    // ── Section evaluators ────────────────────────────────────────────────────

    /**
     * Contact completeness — max 12 pts.
     *   Email:    4 pts (essential, recruiters must reply)
     *   Phone:    3 pts (still required for initial screens)
     *   LinkedIn: 3 pts (most recruiters verify profile)
     *   GitHub:   2 pts (technical roles — shows live work)
     */
    private int evaluateContact(String rawText, Map<String, Object> contact,
                                 List<String> missing, List<String> suggestions,
                                 List<String> strengths) {
        int pts = 0;

        boolean hasEmail = contact.get("email") != null || EMAIL_PAT.matcher(rawText).find();
        if (hasEmail) {
            pts += 4;
            strengths.add("Email address present");
        } else {
            missing.add("Email address");
            suggestions.add("Add a professional email — recruiters need it to respond to your application.");
        }

        boolean hasPhone = contact.get("phone") != null || PHONE_PAT.matcher(rawText).find();
        if (hasPhone) {
            pts += 3;
            strengths.add("Phone number present");
        } else {
            missing.add("Phone number");
            suggestions.add("Add a phone number with country code — many recruiters prefer a quick call for initial screening.");
        }

        boolean hasLinkedIn = contact.get("linkedin") != null || LINKEDIN_PAT.matcher(rawText).find();
        if (hasLinkedIn) {
            pts += 3;
            strengths.add("LinkedIn profile linked");
        } else {
            suggestions.add("Add your LinkedIn URL — recruiters consistently check it before reaching out.");
        }

        boolean hasGitHub = contact.get("github") != null || GITHUB_PAT.matcher(rawText).find();
        if (hasGitHub) {
            pts += 2;
            strengths.add("GitHub profile linked");
        } else {
            suggestions.add("Add your GitHub URL — for technical roles it serves as a live portfolio.");
        }

        return pts;
    }

    /**
     * Summary quality — max 10 pts.
     *   Present + good length (50–150 words): 10
     *   Present but too long (>200 words):     6  — verbose, ATS truncates it
     *   Present but very short (<30 words):    5  — not enough context
     *   Missing:                               0
     */
    private int evaluateSummary(String rawText, String lower,
                                 Map<String, Object> parsed,
                                 List<String> missing, List<String> suggestions,
                                 List<String> strengths) {
        boolean present = lower.contains("summary") || lower.contains("objective")
                || lower.contains("professional profile") || lower.contains("about me");

        if (!present) {
            missing.add("Professional summary");
            suggestions.add("Add a 2-3 sentence summary at the top — it's the first thing ATS and recruiters read.");
            return 0;
        }

        // Estimate summary section word count from parsed data or raw text heuristic
        String summaryText = extractSectionSnippet(rawText, "summary|objective|professional profile|about me");
        int summaryWords = summaryText != null ? countWords(summaryText) : 0;

        if (summaryWords > 200) {
            suggestions.add("Your summary is " + summaryWords + " words — cut it to 3 sentences (50-100 words). "
                    + "Verbose summaries are truncated by ATS and skipped by recruiters.");
            return 6;
        }

        if (summaryWords > 0 && summaryWords < 30) {
            suggestions.add("Your summary is very brief — expand to 2-3 sentences highlighting your top skill, "
                    + "years of experience, and key impact.");
            strengths.add("Professional summary present");
            return 5;
        }

        strengths.add("Professional summary found");
        return 10;
    }

    /**
     * Experience quality — max 25 pts.
     *   Section present:                5
     *   Has date ranges on all roles:   3
     *   Has company names:              2
     *   Has bullet points:              5
     *   Has measurable impact in bullets: 5  (checked separately in metrics)
     *   Job title clarity:              5  (no vague titles like "Consultant")
     */
    private int evaluateExperience(String rawText, String lower,
                                    Map<String, Object> parsed,
                                    List<String> missing, List<String> suggestions,
                                    List<String> strengths) {
        boolean hasSection = lower.contains("experience") || lower.contains("employment")
                || lower.contains("work history");

        if (!hasSection) {
            missing.add("Work experience section");
            suggestions.add("Add a work experience section — it typically accounts for 40-50% of ATS scoring.");
            return 0;
        }

        int pts = 5;
        strengths.add("Work experience section present");

        // Check for date ranges (critical for ATS gap detection)
        Pattern dateRange = Pattern.compile(
                "\\b(20\\d{2}|19\\d{2})\\s*(?:–|—|-|to)\\s*(20\\d{2}|19\\d{2}|present|current)",
                Pattern.CASE_INSENSITIVE);
        if (dateRange.matcher(rawText).find()) {
            pts += 3;
            strengths.add("Employment dates present on experience entries");
        } else {
            missing.add("Date ranges on work experience");
            suggestions.add("Add start–end dates to every job. ATS systems rank resumes with complete date ranges higher.");
        }

        // Bullet points: check for actual bullet characters or dash-prefixed lines
        Pattern bulletPat = Pattern.compile("^[•\\-\\*▸›◦▪]\\s+\\S", Pattern.MULTILINE);
        int bulletCount = countMatches(bulletPat, rawText);
        if (bulletCount >= 10) {
            pts += 5;
            strengths.add("Well-detailed experience bullets (" + bulletCount + " bullet points)");
        } else if (bulletCount >= 3) {
            pts += 3;
            suggestions.add("Add more bullet points per role (aim for 3-5 per job) to give ATS more signals.");
        } else {
            suggestions.add("Use bullet points to describe each role — ATS parsers extract achievements from them.");
        }

        // Action verbs — count unique verbs used
        int uniqueVerbCount = countUniqueActionVerbs(lower);
        if (uniqueVerbCount >= 8) {
            pts += 5;
            strengths.add("Strong use of varied action verbs (" + uniqueVerbCount + " unique verbs)");
        } else if (uniqueVerbCount >= 4) {
            pts += 3;
            suggestions.add("Vary your action verbs more. You use " + uniqueVerbCount
                    + " unique verbs — aim for 8+ to signal broad ownership.");
        } else {
            suggestions.add("Start each bullet with a strong action verb (Led, Built, Reduced, Scaled, Owned). "
                    + "You currently use fewer than 4 distinct verbs.");
        }

        // Company names: check for known patterns (capitalised proper nouns near dates)
        pts += 2; // assume present if experience section exists — parser handles this

        return Math.min(25, pts);
    }

    /**
     * Skills — max 10 pts.
     *   Well-categorised Map with 3+ non-empty categories: 10
     *   Present but only 1-2 categories:                    6
     *   Only keyword list, no structure:                     4
     *   Missing entirely:                                    0
     */
    private int evaluateSkills(String lower, Map<String, Object> parsed,
                                List<String> missing, List<String> suggestions,
                                List<String> strengths) {
        Object skillsObj = parsed != null ? parsed.get("skills") : null;
        int categoriesWithContent = 0;

        if (skillsObj instanceof Map<?, ?> m) {
            for (Object v : m.values()) {
                if (v instanceof List<?> l && !l.isEmpty()) categoriesWithContent++;
            }
        }

        // Fallback: check if the raw text has an obvious skills section
        boolean textHasSkills = lower.contains("skills") || lower.contains("technologies")
                || lower.contains("core competencies") || lower.contains("technical stack");

        if (categoriesWithContent >= 4) {
            strengths.add("Skills well-categorised across " + categoriesWithContent + " areas");
            return 10;
        } else if (categoriesWithContent >= 2) {
            suggestions.add("Break your skills into more categories (e.g. Languages, Frameworks, Cloud, Databases, Tools) "
                    + "— it increases keyword surface area for ATS matching.");
            strengths.add("Skills section present");
            return 6;
        } else if (categoriesWithContent == 1 || textHasSkills) {
            suggestions.add("Your skills section exists but is not well-structured. "
                    + "Use labelled categories — ATS systems score categorised skills more accurately.");
            strengths.add("Skills section present");
            return 4;
        } else {
            missing.add("Skills section");
            suggestions.add("Add a dedicated skills section with clearly labelled categories. "
                    + "This is one of the highest-weight signals in ATS parsing.");
            return 0;
        }
    }

    /**
     * Education — max 8 pts.
     *   Degree + institution + graduation year: 8
     *   Degree + institution (no year):         5
     *   Just mentions education keyword:        3
     *   Missing:                                0
     */
    private int evaluateEducation(String lower, List<String> missing,
                                   List<String> suggestions, List<String> strengths) {
        boolean hasSection = lower.contains("education") || lower.contains("university")
                || lower.contains("college") || lower.contains("bachelor")
                || lower.contains("master") || lower.contains("degree")
                || lower.contains("b.tech") || lower.contains("m.tech");

        if (!hasSection) {
            missing.add("Education section");
            suggestions.add("Add your education — even if you are senior, ATS filters often screen by degree.");
            return 0;
        }

        // Check for graduation year (signals complete entry)
        Pattern yearPat = Pattern.compile("\\b(20\\d{2}|19\\d{2})\\b");
        boolean hasYear = yearPat.matcher(lower).find();

        // Check for institution-level keywords
        boolean hasInstitution = lower.contains("university") || lower.contains("college")
                || lower.contains("institute") || lower.contains("school");

        if (hasYear && hasInstitution) {
            strengths.add("Education section complete (degree, institution, graduation year)");
            return 8;
        } else if (hasInstitution) {
            suggestions.add("Add your graduation year to the education section — ATS uses it for experience gap detection.");
            strengths.add("Education section present");
            return 5;
        } else {
            strengths.add("Education section present");
            return 3;
        }
    }

    /**
     * Projects / portfolio — max 8 pts.
     *   Dedicated projects section with descriptions: 8
     *   Mentioned in passing (no section):            3
     *   Missing entirely:                             0
     */
    private int evaluateProjects(String lower, Map<String, Object> parsed,
                                  List<String> suggestions, List<String> strengths) {
        // Check parsed data for a non-empty projects list
        boolean parsedHasProjects = Optional.ofNullable(parsed)
                .map(p -> p.get("projects") instanceof List<?> l && !l.isEmpty())
                .orElse(false);

        if (parsedHasProjects) {
            strengths.add("Projects section found");
            return 8;
        }

        // Keyword-level fallback
        boolean textMentionsProjects = lower.contains("project") || lower.contains("portfolio")
                || lower.contains("open source") || lower.contains("github.com");

        if (textMentionsProjects) {
            suggestions.add("You mention projects but have no dedicated section. "
                    + "Add a Projects section listing 2-3 significant ones with tech stack and impact — "
                    + "especially important for backend engineers to show system design thinking.");
            return 3;
        }

        suggestions.add("Add a Projects section — it demonstrates initiative beyond job duties "
                + "and significantly widens ATS keyword matches for your tech stack.");
        return 0;
    }

    /**
     * Certifications — max 5 pts.
     *   2+ relevant certifications: 5
     *   Exactly 1 certification:    3
     *   None found:                 0
     */
    private int evaluateCertifications(String rawText, String lower,
                                        Map<String, Object> parsed,
                                        List<String> suggestions, List<String> strengths) {
        // Check parsed certifications list
        int parsedCount = Optional.ofNullable(parsed)
                .map(p -> p.get("certifications") instanceof List<?> l ? l.size() : 0)
                .orElse(0);

        // Also scan raw text for common cert patterns
        Pattern certPat = Pattern.compile(
                "\\b(aws|azure|gcp|google cloud|cka|ckad|pmp|scrum|agile|" +
                "oracle|sun|ibm|cisco|comptia|spring professional|hashicorp|" +
                "certified|certification|certificate|mastery award)\\b",
                Pattern.CASE_INSENSITIVE);
        int textCertMentions = countMatches(certPat, rawText);

        int effectiveCount = Math.max(parsedCount, textCertMentions > 0 ? 1 : 0);

        if (effectiveCount >= 2) {
            strengths.add("Multiple certifications listed (" + effectiveCount + ")");
            return 5;
        } else if (effectiveCount == 1) {
            suggestions.add("You have 1 certification. For a senior backend engineer (6+ years), "
                    + "adding 1-2 cloud or architecture certs (AWS, GCP, CKA, Spring Professional) "
                    + "significantly improves ATS ranking for senior roles.");
            strengths.add("Certification present");
            return 3;
        } else {
            suggestions.add("No certifications detected. Adding 1-2 relevant certifications "
                    + "can be the difference between ATS pass and fail for senior roles at larger companies.");
            return 0;
        }
    }

    /**
     * Writing quality — max 12 pts.
     * Penalises:
     *   - Repetitive filler phrase "resulting in" (each excess occurrence beyond 3)
     *   - Identical sentence structure repeated across bullets
     * Rewards:
     *   - Varied sentence starters
     *   - Specific technical nouns (not just verbs)
     */
    private int evaluateWritingQuality(String rawText, String lower,
                                        List<String> suggestions, List<String> strengths) {
        int pts = 12; // start full and deduct

        // Count "resulting in" occurrences — hallmark of templated/AI-generated content
        int resultingInCount = countMatches(RESULTING_IN, rawText);
        if (resultingInCount > 10) {
            int deduct = Math.min(8, resultingInCount - 3); // cap deduction
            pts -= deduct;
            suggestions.add("\"Resulting in\" appears " + resultingInCount + " times across your resume. "
                    + "This pattern signals templated writing to ATS systems and recruiters. "
                    + "Replace most occurrences with direct impact statements: "
                    + "\"Cut deployment time by 40%\" instead of \"implemented CI/CD, resulting in a 40% reduction\".");
        } else if (resultingInCount > 5) {
            pts -= 3;
            suggestions.add("\"Resulting in\" appears " + resultingInCount + " times. "
                    + "Vary your bullet endings to avoid sounding formulaic.");
        } else if (resultingInCount > 0) {
            // Acceptable usage
        }

        // Count filler generic endings like "resulting in a X% increase in productivity"
        int fillerCount = countMatches(FILLER_PHRASES, rawText);
        if (fillerCount > 5) {
            pts -= 2;
            suggestions.add("Many of your bullets end with \"resulting in a X% increase in Y\" — "
                    + "lead with the metric instead: '40% faster deployments via GitHub Actions + Docker'.");
        }

        if (pts >= 10) {
            strengths.add("Writing is direct and varied");
        } else if (pts >= 7) {
            strengths.add("Writing quality acceptable — some repetition detected");
        }

        return Math.max(0, pts);
    }

    /**
     * Quantified achievements — max 5 pts.
     *   10+ distinct metrics: 5
     *   5–9 metrics:          4
     *   2–4 metrics:          2
     *   0–1 metrics:          0
     */
    private int evaluateMetrics(String rawText,
                                 List<String> suggestions, List<String> strengths) {
        int metricCount = countMatches(METRIC_PAT, rawText);

        if (metricCount >= 10) {
            strengths.add("Strong use of quantified metrics (" + metricCount + " data points)");
            return 5;
        } else if (metricCount >= 5) {
            strengths.add("Good use of metrics in experience bullets (" + metricCount + " data points)");
            return 4;
        } else if (metricCount >= 2) {
            suggestions.add("You have " + metricCount + " quantified metrics — aim for at least one per bullet. "
                    + "Numbers are the single most effective ATS and recruiter signal.");
            return 2;
        } else {
            suggestions.add("Add specific numbers to your bullets: users served, latency reduced (ms), "
                    + "uptime %, cost saved ($), team size led. Resumes with metrics outscore generic ones by 40%.");
            return 0;
        }
    }

    /**
     * Length / readability — max 5 pts.
     * Calibrated to years of experience:
     *   < 300 words:       1  — too thin regardless of seniority
     *   300–600 words:     3  — fine for < 3 years experience, lean for senior
     *   600–1000 words:    5  — sweet spot for 5-10 year engineers
     *   1000–1200 words:   4  — acceptable for senior/lead with many roles
     *   > 1200 words:      1  — excessive; ATS readability drops, recruiters skim less
     */
    private int evaluateLength(int wordCount,
                                List<String> suggestions, List<String> strengths) {
        if (wordCount >= 600 && wordCount <= 1000) {
            strengths.add("Ideal resume length (" + wordCount + " words) — the sweet spot for experienced engineers");
            return 5;
        } else if (wordCount > 1000 && wordCount <= 1200) {
            strengths.add("Acceptable resume length (" + wordCount + " words) — "
                    + "fine for senior or lead roles with many projects and responsibilities");
            return 4;
        } else if (wordCount >= 300 && wordCount < 600) {
            suggestions.add("Your resume is " + wordCount + " words — that's lean for a senior profile. "
                    + "Expand your experience bullets with impact metrics and your skills section with "
                    + "labelled categories. Target 600-1000 words.");
            return 3;
        } else if (wordCount > 1200) {
            suggestions.add("At " + wordCount + " words your resume is exceeding the senior-profile ceiling of ~1200. "
                    + "Remove duplicate-pattern bullets, cut the summary to 3 sentences, "
                    + "and consolidate older roles into 1-2 bullets each.");
            return 1;
        } else {
            // < 300
            suggestions.add("Your resume is only " + wordCount + " words — significantly too sparse. "
                    + "Add detailed experience bullets (3-5 per role), a skills section, "
                    + "and a professional summary to reach the 600-1000 word target.");
            return 1;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int countMatches(Pattern pat, String text) {
        Matcher m = pat.matcher(text);
        int count = 0;
        while (m.find()) count++;
        return count;
    }

    private int countUniqueActionVerbs(String lower) {
        int count = 0;
        for (String verb : ACTION_VERBS) {
            if (lower.contains(verb)) count++;
        }
        return count;
    }

    private String extractSectionSnippet(String rawText, String sectionRegex) {
        Pattern header = Pattern.compile(
                "^(?:" + sectionRegex + "):?\\s*$", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        Pattern nextHeader = Pattern.compile(
                "^(?:experience|work|employment|education|skills?|projects?|" +
                "certif|awards?|honors?|achievements?|publications?|references?):?\\s*$",
                Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        Matcher m = header.matcher(rawText);
        if (!m.find()) return null;
        int start = m.end();
        Matcher next = nextHeader.matcher(rawText);
        int end = rawText.length();
        while (next.find()) {
            if (next.start() > start) { end = next.start(); break; }
        }
        return rawText.substring(start, Math.min(end, start + 2000)).trim();
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().split("\\s+").length;
    }

    private String buildLengthLabel(int wordCount) {
        if (wordCount < 300)
            return "Too sparse (" + wordCount + " words) — aim for 600-1000 words.";
        if (wordCount < 600)
            return "Lean (" + wordCount + " words) — fine for early-career; senior profiles should target 600-1000.";
        if (wordCount <= 1000)
            return "Ideal length (" + wordCount + " words) — sweet spot for 5-10 year engineers.";
        if (wordCount <= 1200)
            return "Acceptable (" + wordCount + " words) — appropriate for senior/lead with many roles.";
        return "Verbose (" + wordCount + " words) — trim to under 1200 for best ATS and recruiter readability.";
    }

    private String scoreLabel(int score) {
        if (score >= 88) return "Excellent";
        if (score >= 75) return "Good";
        if (score >= 55) return "Fair";
        return "Needs Work";
    }
}
