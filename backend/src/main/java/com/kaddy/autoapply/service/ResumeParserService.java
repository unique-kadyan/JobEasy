package com.kaddy.autoapply.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.service.ai.AiProviderFactory;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Year;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ResumeParserService {

    private static final Logger log = LoggerFactory.getLogger(ResumeParserService.class);

    private static final String RESUME_PARSE_SYSTEM = """
            You are a precise resume data extractor. Extract every detail from the resume text into structured JSON.
            Be thorough — capture all jobs, degrees, skills, and projects present in the text.

            Return ONLY this JSON (no markdown, no explanation):
            {
              "name": "Full Name",
              "contact": {
                "email": "email or null",
                "phone": "phone or null",
                "location": "City, Country or null",
                "linkedin": "full linkedin URL or null",
                "github": "full github URL or null",
                "portfolio": "portfolio URL or null"
              },
              "summary": "professional summary or null",
              "experience": [
                {
                  "title": "Job Title",
                  "company": "Company Name",
                  "location": "City or null",
                  "startDate": "Month Year or Year",
                  "endDate": "Month Year or Year or Present",
                  "current": false,
                  "bullets": ["achievement 1", "achievement 2"]
                }
              ],
              "education": [
                {
                  "institution": "University Name",
                  "degree": "Bachelor/Master/PhD/etc",
                  "field": "Field of Study",
                  "graduationDate": "Year",
                  "gpa": "GPA or null"
                }
              ],
              "skills": {
                "technical": [],
                "frameworks": [],
                "databases": [],
                "cloud": [],
                "tools": [],
                "soft": [],
                "languages": []
              },
              "projects": [{"name":"","description":"","technologies":[],"url":null}],
              "certifications": [{"name":"","issuer":"","date":""}]
            }
            """;

    private final AiProviderFactory aiProviderFactory;
    private final ObjectMapper objectMapper;

    public ResumeParserService(AiProviderFactory aiProviderFactory, ObjectMapper objectMapper) {
        this.aiProviderFactory = aiProviderFactory;
        this.objectMapper = objectMapper;
    }

    private static final Set<String> TECHNICAL_SKILLS = Set.of(
            "java", "python", "javascript", "typescript", "c++", "c#", "go", "golang", "rust",
            "swift", "kotlin", "scala", "ruby", "php", "r", "matlab", "bash", "shell",
            "powershell", "dart", "elixir", "haskell", "clojure", "groovy", "lua");

    private static final Set<String> FRAMEWORK_SKILLS = Set.of(
            "react", "angular", "vue", "next.js", "nuxt", "svelte", "spring", "spring boot",
            "django", "flask", "fastapi", "express", "nestjs", "laravel", "rails", "asp.net",
            "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "hibernate", "quarkus",
            "micronaut", "actix", "gin", "echo", "fiber", "htmx", "remix", "astro", "solid");

    private static final Set<String> DATABASE_SKILLS = Set.of(
            "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb",
            "sqlite", "oracle", "sql server", "neo4j", "influxdb", "clickhouse", "cockroachdb",
            "supabase", "firestore", "couchdb", "mariadb", "aurora", "bigquery", "snowflake");

    private static final Set<String> CLOUD_SKILLS = Set.of(
            "aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify", "cloudflare",
            "s3", "ec2", "lambda", "cloudfront", "rds", "ecs", "eks", "sqs", "sns", "route53",
            "terraform", "pulumi", "cdk", "cloudformation", "serverless");

    private static final Set<String> TOOL_SKILLS = Set.of(
            "docker", "kubernetes", "helm", "ansible", "jenkins", "github actions", "gitlab ci",
            "circle ci", "travis ci", "git", "jira", "confluence", "webpack", "vite", "gradle",
            "maven", "npm", "yarn", "pnpm", "makefile", "nginx", "apache", "kafka", "rabbitmq",
            "graphql", "grpc", "rest", "openapi", "swagger", "postman", "figma");

    private static final Set<String> SOFT_SKILLS = Set.of(
            "leadership", "communication", "teamwork", "problem solving", "critical thinking",
            "agile", "scrum", "kanban", "mentoring", "collaboration", "adaptability",
            "project management", "cross-functional", "stakeholder management");

    private static final Set<String> LANGUAGE_SKILLS = Set.of(
            "english", "spanish", "french", "german", "mandarin", "hindi", "japanese",
            "portuguese", "arabic", "korean", "italian", "dutch", "russian", "turkish");

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}", Pattern.CASE_INSENSITIVE);

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "\\+?[0-9]{0,3}[\\s.\\-]?\\(?[0-9]{3}\\)?[\\s.\\-]?[0-9]{3}[\\s.\\-]?[0-9]{4}");

    private static final Pattern LINKEDIN_PATTERN = Pattern.compile(
            "(?:https?://)?(?:www\\.)?linkedin\\.com/(?:in/)?([\\w\\-]{3,100})", Pattern.CASE_INSENSITIVE);

    private static final Pattern GITHUB_PATTERN = Pattern.compile(
            "github\\.com/([\\w\\-]+)", Pattern.CASE_INSENSITIVE);

    private static final Pattern PORTFOLIO_PATTERN = Pattern.compile(
            "https?://(?!(?:www\\.)?(?:linkedin|github))[\\w.\\-]+\\.[a-z]{2,}(?:/[\\w./\\-?=&%#]*)?",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern YEAR_RANGE_PATTERN = Pattern.compile(
            "\\b(20\\d{2}|19\\d{2})\\s*(?:–|—|-|to)\\s*(20\\d{2}|19\\d{2}|present|current|now)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern LOCATION_PATTERN = Pattern.compile(
            "\\b([A-Z][a-z]+(?:\\s[A-Z][a-z]+)*),\\s*([A-Z]{2}|[A-Z][a-z]+(?:\\s[A-Z][a-z]+)*)\\b");

    public String extractText(Path filePath) {
        try (PDDocument document = Loader.loadPDF(filePath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (IOException e) {
            log.warn("Failed to extract text from PDF {}: {}", filePath, e.getMessage());
            return "";
        }
    }

    public String extractTextFromBytes(byte[] pdfBytes) {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (IOException e) {
            log.warn("Failed to extract text from PDF bytes: {}", e.getMessage());
            return "";
        } catch (RuntimeException e) {
            log.warn("Unexpected error extracting PDF text ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            return "";
        }
    }

    /**
     * Parses resume text into structured data.
     * AI is tried first — far more accurate for natural language.
     * Falls back to regex parsing if all AI providers fail.
     */
    public Map<String, Object> parseStructuredData(String text) {
        Map<String, Object> parsed = parseWithAi(text);
        if (parsed == null) {
            log.info("All AI providers unavailable — using regex parser as fallback");
            parsed = parseWithRegex(text);
        }
        // These two fields are always computed structurally regardless of parse path
        parsed.put("wordCount", text.split("\\s+").length);
        parsed.put("experienceYears", estimateExperienceYears(text));
        return parsed;
    }

    /** AI-driven structured extraction — primary parse path. */
    private Map<String, Object> parseWithAi(String text) {
        try {
            String userPrompt = "Extract structured data from this resume text:\n\n" + text;
            AiProviderFactory.GenerationResult result = aiProviderFactory.generate(
                    RESUME_PARSE_SYSTEM, userPrompt, AiProviderFactory.TaskType.RESUME_PARSING);
            String raw = result.content().trim();
            if (raw.startsWith("```")) {
                int start = raw.indexOf('{');
                int end = raw.lastIndexOf('}');
                if (start >= 0 && end > start) raw = raw.substring(start, end + 1);
            }
            Map<String, Object> aiData = objectMapper.readValue(raw, new TypeReference<>() {});
            // Supplement AI skills with keyword-set matching — catches acronyms AI may miss
            String lower = text.toLowerCase();
            Map<String, List<String>> localSkills = categorizeSkills(lower);
            if (aiData.get("skills") instanceof Map<?, ?> aiSkills) {
                Map<String, Object> merged = new LinkedHashMap<>(
                        objectMapper.convertValue(aiSkills, new TypeReference<>() {}));
                for (Map.Entry<String, List<String>> entry : localSkills.entrySet()) {
                    merged.merge(entry.getKey(), entry.getValue(), (existing, local) -> {
                        if (existing instanceof List<?> eList) {
                            java.util.Set<String> combined = new java.util.LinkedHashSet<>();
                            eList.stream().filter(String.class::isInstance)
                                    .map(String.class::cast).forEach(combined::add);
                            ((List<?>) local).stream().filter(String.class::isInstance)
                                    .map(String.class::cast).forEach(combined::add);
                            return new ArrayList<>(combined);
                        }
                        return existing;
                    });
                }
                aiData.put("skills", merged);
            } else {
                aiData.put("skills", localSkills);
            }
            log.info("AI resume parsing succeeded via {}", result.providerName());
            return aiData;
        } catch (Exception e) {
            log.warn("AI resume parsing failed — falling back to regex: {}", e.getMessage());
            return null;
        }
    }

    /** Regex-based fallback parser — used only when all AI providers are unavailable. */
    private Map<String, Object> parseWithRegex(String text) {
        Map<String, Object> data = new LinkedHashMap<>();
        String lower = text.toLowerCase();
        String[] lines = text.split("\\r?\\n");

        data.put("name", extractName(lines));
        data.put("contact", extractContact(text));
        data.put("summary", extractSectionText(text, "summary|objective|professional profile|about me|profile"));
        data.put("experience", extractExperience(text));
        data.put("education", extractEducation(text));
        data.put("skills", categorizeSkills(lower));
        data.put("projects", new ArrayList<>());
        data.put("certifications", new ArrayList<>());

        return data;
    }

    private String extractName(String[] lines) {
        Pattern sectionKeywords = Pattern.compile(
                "^(experience|work|employment|education|skill|project|certif|summary|objective|contact|email|phone|address|linkedin|github)",
                Pattern.CASE_INSENSITIVE);
        Pattern emailOrUrl = Pattern.compile("[@+]|https?://|\\d{5,}|\\.com|\\.io|\\.net");

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() < 3 || trimmed.length() > 60)
                continue;
            if (sectionKeywords.matcher(trimmed).find())
                continue;
            if (emailOrUrl.matcher(trimmed).find())
                continue;
            if (trimmed.matches(".*[|/:\\\\]{2,}.*"))
                continue;
            if (trimmed.matches("[A-Za-z\\s.''\\-]+") && trimmed.split("\\s+").length >= 2
                    && trimmed.split("\\s+").length <= 5) {
                return trimmed;
            }
        }
        return null;
    }

    private Map<String, Object> extractContact(String text) {
        Map<String, Object> contact = new LinkedHashMap<>();

        Matcher email = EMAIL_PATTERN.matcher(text);
        if (email.find())
            contact.put("email", email.group());

        Matcher phone = PHONE_PATTERN.matcher(text);
        if (phone.find())
            contact.put("phone", phone.group().trim());

        Matcher linkedin = LINKEDIN_PATTERN.matcher(text);
        if (linkedin.find()) {
            String handle = linkedin.group(1);
            // Skip generic slugs that aren't real profile handles
            if (!handle.equalsIgnoreCase("company") && !handle.equalsIgnoreCase("pub")) {
                contact.put("linkedin", "https://linkedin.com/in/" + handle);
            }
        }

        Matcher github = GITHUB_PATTERN.matcher(text);
        if (github.find())
            contact.put("github", "https://github.com/" + github.group(1));

        Matcher portfolio = PORTFOLIO_PATTERN.matcher(text);
        if (portfolio.find())
            contact.put("portfolio", portfolio.group());

        extractLocation(text).ifPresent(loc -> contact.put("location", loc));

        return contact;
    }

    private Optional<String> extractLocation(String text) {
        Matcher m = LOCATION_PATTERN.matcher(text);
        while (m.find()) {
            String candidate = m.group();
            if (!candidate.matches(".*\\d.*") && candidate.length() > 4 && candidate.length() < 60) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }

    // All known section header keywords — used as stop-boundaries when extracting a section.
    private static final Pattern ANY_SECTION_HEADER = Pattern.compile(
            "^(?:experience|work\\s*experience|employment(?:\\s*history)?|professional\\s*experience|" +
            "work\\s*history|education|academic\\s*(?:background|history|qualifications)|qualifications|" +
            "skills?|technical\\s*skills|core\\s*competencies|key\\s*skills|" +
            "projects?|personal\\s*projects|open\\s*source|notable\\s*projects|" +
            "certifications?|certificates?|licen[sc]es?|" +
            "summary|objective|professional\\s*(?:summary|profile)|about\\s*me|profile|" +
            "awards?|honors?|achievements?|accomplishments?|" +
            "publications?|research|" +
            "volunteering?|extracurricular|activities|" +
            "languages?|" +
            "references?|contact(?:\\s*info(?:rmation)?)?|interests?|hobbies?):?$",
            Pattern.CASE_INSENSITIVE);

    /**
     * Extracts the body of a named section from resume text using a line-by-line
     * parser. Stops at the next known section header, which fixes the previous
     * regex-based approach where the (?i) flag made the ALL-CAPS terminator
     * match any 4-letter word and silently truncate section content.
     */
    private String extractSectionText(String text, String sectionRegex) {
        Pattern targetHeader = Pattern.compile(
                "^(?:" + sectionRegex + "):?$", Pattern.CASE_INSENSITIVE);

        String[] lines = text.split("\\r?\\n");
        boolean inSection = false;
        StringBuilder content = new StringBuilder();

        for (String line : lines) {
            String trimmed = line.trim();
            if (targetHeader.matcher(trimmed).matches()) {
                if (inSection) break; // same header seen again — stop
                inSection = true;
                continue;
            }
            if (inSection) {
                if (!trimmed.isEmpty()
                        && ANY_SECTION_HEADER.matcher(trimmed).matches()
                        && content.length() > 0) {
                    break;
                }
                content.append(line).append("\n");
            }
        }

        String result = content.toString().trim();
        return result.length() > 20 ? result : null;
    }

    private Map<String, List<String>> categorizeSkills(String lower) {
        Map<String, List<String>> skills = new LinkedHashMap<>();
        skills.put("technical", matchSkills(lower, TECHNICAL_SKILLS));
        skills.put("frameworks", matchSkills(lower, FRAMEWORK_SKILLS));
        skills.put("databases", matchSkills(lower, DATABASE_SKILLS));
        skills.put("cloud", matchSkills(lower, CLOUD_SKILLS));
        skills.put("tools", matchSkills(lower, TOOL_SKILLS));
        skills.put("soft", matchSkills(lower, SOFT_SKILLS));
        skills.put("languages", matchSkills(lower, LANGUAGE_SKILLS));
        return skills;
    }

    private List<String> matchSkills(String lower, Set<String> skillSet) {
        return skillSet.stream()
                .filter(lower::contains)
                .sorted()
                .collect(Collectors.toList());
    }

    // ── Experience / Education parsing ────────────────────────────────────────

    private static final Pattern DATE_RANGE_INLINE = Pattern.compile(
            "\\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s*)?(20\\d{2}|19\\d{2})" +
            "\\s*(?:–|—|-|to)\\s*" +
            "((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s*)?(20\\d{2}|19\\d{2}|present|current|now)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern BULLET_START = Pattern.compile("^[•\\-\\*▪▸►→✓◦◆]\\s*");

    private static final Pattern DEGREE_PAT = Pattern.compile(
            "(?i)\\b(bachelor|master|phd|ph\\.d|doctorate|associate|diploma|" +
            "b\\.?s\\.?|m\\.?s\\.?|b\\.?a\\.?|m\\.?a\\.?|mba|b\\.?tech|m\\.?tech|" +
            "b\\.?e\\.?|m\\.?e\\.?|b\\.?sc\\.?|m\\.?sc\\.?|bcom|mcom|b\\.?com|m\\.?com)\\b");

    private static final Pattern SINGLE_YEAR = Pattern.compile("\\b(20\\d{2}|19\\d{2})\\b");

    private List<Map<String, Object>> extractExperience(String text) {
        String section = extractSectionText(text,
                "experience|work experience|employment|professional experience|work history|employment history");
        if (section == null || section.isBlank()) return new ArrayList<>();
        List<Map<String, Object>> entries = new ArrayList<>();
        for (String[] block : splitBlocks(section)) {
            Map<String, Object> entry = parseExperienceBlock(block);
            if (entry != null) entries.add(entry);
        }
        return entries;
    }

    private List<Map<String, Object>> extractEducation(String text) {
        String section = extractSectionText(text,
                "education|academic background|academic history|qualifications|academic qualifications");
        if (section == null || section.isBlank()) return new ArrayList<>();
        List<Map<String, Object>> entries = new ArrayList<>();
        for (String[] block : splitBlocks(section)) {
            Map<String, Object> entry = parseEducationBlock(block);
            if (entry != null) entries.add(entry);
        }
        return entries;
    }

    /** Split section text into blocks of non-blank lines separated by blank lines. */
    private List<String[]> splitBlocks(String section) {
        String[] paragraphs = section.split("\\r?\\n(\\s*\\r?\\n)+");
        List<String[]> blocks = new ArrayList<>();
        for (String para : paragraphs) {
            String[] lines = Arrays.stream(para.split("\\r?\\n"))
                    .map(String::trim)
                    .filter(l -> !l.isBlank())
                    .toArray(String[]::new);
            if (lines.length > 0) blocks.add(lines);
        }
        return blocks;
    }

    private Map<String, Object> parseExperienceBlock(String[] lines) {
        String headerLine = null;
        String dateLine   = null;
        List<String> bullets = new ArrayList<>();

        for (String line : lines) {
            if (DATE_RANGE_INLINE.matcher(line).find()) {
                if (dateLine == null) {
                    // If there's content before the date on the same line, treat it as header
                    Matcher dm = DATE_RANGE_INLINE.matcher(line);
                    dm.find();
                    String before = line.substring(0, dm.start()).trim();
                    if (!before.isEmpty() && headerLine == null) headerLine = before;
                    dateLine = line;
                }
            } else if (BULLET_START.matcher(line).find()) {
                bullets.add(BULLET_START.matcher(line).replaceFirst("").trim());
            } else if (headerLine == null) {
                headerLine = line;
            }
        }

        if (headerLine == null && dateLine == null) return null;

        Map<String, Object> entry = new LinkedHashMap<>();

        // Parse "Title | Company" or "Title @ Company" or "Title, Company"
        if (headerLine != null) {
            String[] parts = headerLine.split("\\s*[|@·]\\s*", 2);
            entry.put("title", parts[0].trim());
            if (parts.length > 1) {
                // Might be "Company, Location" — split off location
                String[] sub = parts[1].split(",\\s*", 2);
                entry.put("company", sub[0].trim());
                if (sub.length > 1) entry.put("location", sub[1].trim());
            }
        }

        // Parse date range
        if (dateLine != null) {
            Matcher m = DATE_RANGE_INLINE.matcher(dateLine);
            if (m.find()) {
                String startMonth = m.group(1) != null ? m.group(1).trim() + " " : "";
                String startYear  = m.group(2);
                String endMonth   = m.group(3) != null ? m.group(3).trim() + " " : "";
                String endStr     = m.group(4);
                boolean current   = endStr.toLowerCase().matches("present|current|now");
                entry.put("startDate", (startMonth + startYear).trim());
                entry.put("endDate",   current ? "Present" : (endMonth + endStr).trim());
                entry.put("current",   current);
            }
        }

        if (!bullets.isEmpty()) entry.put("bullets", bullets);
        return (entry.containsKey("title") || entry.containsKey("company")) ? entry : null;
    }

    private Map<String, Object> parseEducationBlock(String[] lines) {
        if (lines.length == 0) return null;
        Map<String, Object> entry = new LinkedHashMap<>();

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;

            // --- GPA: extract and strip from line, then keep processing remainder ---
            Matcher gpaM = Pattern.compile(
                    "(?i)\\bgpa\\b[:\\s/]*([0-9]+\\.[0-9]+(?:\\s*/\\s*[0-9.]+)?)").matcher(line);
            if (gpaM.find() && !entry.containsKey("gpa")) {
                entry.put("gpa", gpaM.group(1).trim());
                line = gpaM.replaceAll("").replaceAll("[,|·\\-]+\\s*$", "").trim();
                if (line.isEmpty()) continue;
            }

            // --- Date range: extract end year as graduationDate, strip from line ---
            Matcher rangeM = DATE_RANGE_INLINE.matcher(line);
            if (rangeM.find() && !entry.containsKey("graduationDate")) {
                String endStr = rangeM.group(4);
                entry.put("graduationDate",
                        endStr.toLowerCase().matches("present|current|now")
                                ? rangeM.group(2) : endStr);
                line = rangeM.replaceAll("").replaceAll("\\s*[–\\-|·,]+\\s*$|^\\s*[–\\-|·,]+\\s*", "").trim();
                if (line.isEmpty()) continue;
            } else if (!entry.containsKey("graduationDate")) {
                Matcher ym = SINGLE_YEAR.matcher(line);
                if (ym.find()) {
                    entry.put("graduationDate", ym.group(1));
                    line = ym.replaceAll("").replaceAll("\\s*[–\\-|·,]+\\s*$|^\\s*[–\\-|·,]+\\s*", "").trim();
                    if (line.isEmpty()) continue;
                }
            }

            // --- Degree: detect on remaining text after date has been stripped ---
            if (DEGREE_PAT.matcher(line).find() && !entry.containsKey("degree")) {
                // "Bachelor of Technology in Computer Science" → degree + field
                String[] inSplit = line.split("(?i)\\s+in\\s+", 2);
                entry.put("degree", inSplit[0].trim());
                if (inSplit.length > 1) {
                    // Field may have trailing location like "Computer Science, Delhi" — strip it
                    String field = inSplit[1].split("[,|·]")[0].trim();
                    if (!field.isEmpty()) entry.put("field", field);
                }
                continue;
            }

            // --- Institution: first unclassified line; second unclassified → degree ---
            if (!entry.containsKey("institution") && line.length() > 2) {
                entry.put("institution", line);
            } else if (!entry.containsKey("degree") && line.length() > 2) {
                entry.put("degree", line);
            }
        }

        return entry.isEmpty() ? null : entry;
    }

    private int estimateExperienceYears(String text) {
        int currentYear = Year.now().getValue();
        List<int[]> ranges = new ArrayList<>();

        Matcher m = YEAR_RANGE_PATTERN.matcher(text);
        while (m.find()) {
            int start = Integer.parseInt(m.group(1));
            String endStr = m.group(2).toLowerCase();
            int end = endStr.matches("present|current|now") ? currentYear : Integer.parseInt(endStr);
            if (start >= 1970 && start <= currentYear && end >= start && end <= currentYear + 1) {
                ranges.add(new int[] { start, end });
            }
        }

        if (ranges.isEmpty())
            return 0;

        int totalMonths = 0;
        for (int[] range : ranges) {
            totalMonths += (range[1] - range[0]) * 12;
        }
        int years = totalMonths / 12;
        return (years > 0 && years <= 50) ? years : 0;
    }
}
