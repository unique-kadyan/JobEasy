package com.kaddy.autoapply.service;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Year;
import java.util.ArrayList;
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
            "linkedin\\.com/in/([\\w\\-]+)", Pattern.CASE_INSENSITIVE);

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

    public Map<String, Object> parseStructuredData(String text) {
        Map<String, Object> data = new LinkedHashMap<>();
        String lower = text.toLowerCase();
        String[] lines = text.split("\\r?\\n");

        data.put("name", extractName(lines));
        data.put("contact", extractContact(text));
        data.put("summary", extractSectionText(text, "summary|objective|professional profile|about me|profile"));
        data.put("experience", new ArrayList<>());
        data.put("education", new ArrayList<>());
        data.put("skills", categorizeSkills(lower));
        data.put("projects", new ArrayList<>());
        data.put("certifications", new ArrayList<>());
        data.put("wordCount", text.split("\\s+").length);
        data.put("experienceYears", estimateExperienceYears(text));

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
        if (linkedin.find())
            contact.put("linkedin", "https://linkedin.com/in/" + linkedin.group(1));

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

    private String extractSectionText(String text, String sectionRegex) {
        Pattern pattern = Pattern.compile(
                "(?im)^\\s*(?:" + sectionRegex
                        + ")\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\s*[A-Z][A-Z\\s]{3,}\\s*\\r?\\n|$)");
        Matcher m = pattern.matcher(text);
        if (m.find()) {
            String content = m.group(1).trim();
            return content.length() > 20 ? content : null;
        }
        return null;
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
