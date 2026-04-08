package com.kaddy.autoapply.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ResumeParserService {

    private static final Logger log = LoggerFactory.getLogger(ResumeParserService.class);

    private static final Set<String> COMMON_SKILLS = Set.of(
            "java", "python", "javascript", "typescript", "react", "angular", "vue",
            "node.js", "spring", "spring boot", "django", "flask", "express",
            "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
            "git", "ci/cd", "jenkins", "github actions", "rest", "graphql",
            "html", "css", "tailwind", "sass", "webpack", "next.js",
            "machine learning", "deep learning", "tensorflow", "pytorch",
            "agile", "scrum", "jira", "confluence"
    );

    public String extractText(Path filePath) {
        try (PDDocument document = Loader.loadPDF(filePath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (IOException e) {
            log.warn("Failed to extract text from PDF {}: {}", filePath, e.getMessage());
            return "";
        }
    }

    public Map<String, Object> parseStructuredData(String text) {
        Map<String, Object> data = new HashMap<>();
        String lower = text.toLowerCase();

        // Extract email
        Matcher emailMatcher = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}").matcher(text);
        if (emailMatcher.find()) {
            data.put("email", emailMatcher.group());
        }

        // Extract phone
        Matcher phoneMatcher = Pattern.compile("\\+?\\d?[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}").matcher(text);
        if (phoneMatcher.find()) {
            data.put("phone", phoneMatcher.group());
        }

        // Extract skills
        List<String> foundSkills = new ArrayList<>();
        for (String skill : COMMON_SKILLS) {
            if (lower.contains(skill)) {
                foundSkills.add(skill);
            }
        }
        data.put("skills", foundSkills);

        // Extract sections
        data.put("hasExperience", lower.contains("experience") || lower.contains("employment"));
        data.put("hasEducation", lower.contains("education") || lower.contains("university") || lower.contains("degree"));
        data.put("hasProjects", lower.contains("project"));
        data.put("hasCertifications", lower.contains("certification") || lower.contains("certificate"));

        // Word count as a rough quality metric
        data.put("wordCount", text.split("\\s+").length);

        return data;
    }
}
