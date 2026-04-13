package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.ResumeAnalysisResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.ResumeAnalysis;
import com.kaddy.autoapply.repository.ResumeAnalysisRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeAnalysisServiceTest {

    @Mock ResumeRepository resumeRepository;
    @Mock ResumeAnalysisRepository analysisRepository;

    @InjectMocks ResumeAnalysisService analysisService;

    @BeforeEach
    public void setUp() {

        lenient().when(analysisRepository.save(any(ResumeAnalysis.class))).thenAnswer(inv -> {
            ResumeAnalysis a = inv.getArgument(0);
            a.setId("analysis1");
            return a;
        });
    }

    @Test
    void analyze_shouldThrowWhenNoResumeFound() {
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of());

        BadRequestException ex = assertThrows(BadRequestException.class, () -> analysisService.analyze("user1"));
        assertNotNull(ex.getMessage());
    }

    @Test
    void analyze_shouldPreferPrimaryResume() {
        Resume nonPrimary = resume("r1", false, minimalText(), Map.of());
        Resume primary    = resume("r2", true,  fullText(),    fullParsedData());

        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1"))
                .thenReturn(List.of(nonPrimary, primary));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertTrue(result.atsScore() > 70, "Primary full resume should score well");
    }

    @Test
    void analyze_shouldFallBackToFirstResumeWhenNoPrimary() {
        Resume only = resume("r1", false, fullText(), fullParsedData());
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1"))
                .thenReturn(List.of(only));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertNotNull(result);
        assertNotNull(result.id());
    }

    @Test
    void analyze_fullResume_shouldScoreHighAndHaveNoMissingFields() {
        Resume resume = resume("r1", true, fullText(), fullParsedData());
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1"))
                .thenReturn(List.of(resume));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertTrue(result.atsScore() >= 70, "Full resume should score at least 70");
        assertTrue(result.strengths().size() > result.missingFields().size(),
                "Full resume should have more strengths than missing fields");
    }

    @Test
    void analyze_emptyResume_shouldScoreLowAndListMissingFields() {
        Resume empty = resume("r1", true, "", Map.of());
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1"))
                .thenReturn(List.of(empty));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertTrue(result.atsScore() < 50, "Empty resume should score below 50");
        assertFalse(result.missingFields().isEmpty(), "Empty resume should have missing fields");
        assertTrue(result.missingFields().contains("Email address"));
        assertTrue(result.missingFields().contains("Professional summary"));
        assertTrue(result.missingFields().contains("Work experience section"));
    }

    @Test
    void analyze_shouldFlagMissingEmail() {
        Resume r = resume("r1", true, fullText(), Map.of(
                "phone", "1234567890",
                "skills", List.of("java"),
                "hasExperience", true,
                "hasEducation", true,
                "wordCount", 450
        ));
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of(r));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertTrue(result.missingFields().contains("Email address"));
    }

    @Test
    void analyze_shouldFlagMissingPhone() {
        Resume r = resume("r1", true, fullText(), Map.of(
                "email", "a@b.com",
                "skills", List.of("java"),
                "hasExperience", true,
                "hasEducation", true,
                "wordCount", 450
        ));
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of(r));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertTrue(result.missingFields().contains("Phone number"));
    }

    @Test
    void analyze_shouldFlagMissingSkills() {
        Resume r = resume("r1", true, fullText(), Map.of(
                "email", "a@b.com",
                "phone", "123",
                "skills", List.of(),
                "hasExperience", true,
                "hasEducation", true,
                "wordCount", 450
        ));
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of(r));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertTrue(result.missingFields().contains("Skills section"));
    }

    @Test
    void analyze_shouldReturnCorrectLabels() {
        Resume empty = resume("r1", true, "", Map.of());
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("u1")).thenReturn(List.of(empty));
        ResumeAnalysisResponse low = analysisService.analyze("u1");

        Resume full = resume("r2", true, fullText(), fullParsedData());
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("u2")).thenReturn(List.of(full));
        ResumeAnalysisResponse high = analysisService.analyze("u2");

        assertNotNull(low.scoreLabel());
        assertNotNull(high.scoreLabel());

        assertNotEquals("Needs Work", high.scoreLabel());
    }

    @Test
    void analyze_shortResume_shouldFlagTooShort() {
        String shortText = "John Doe. Email: a@b.com. Summary: developer. Experience: 2 years.";
        Resume r = resume("r1", true, shortText, Map.of(
                "email", "a@b.com", "wordCount", 10));
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of(r));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertTrue(result.lengthAssessment().contains("Too short")
                || result.wordCount() < 300);
    }

    @Test
    void analyze_shouldPersistResultToRepository() {
        Resume r = resume("r1", true, fullText(), fullParsedData());
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of(r));

        analysisService.analyze("user1");

        verify(analysisRepository).save(any(ResumeAnalysis.class));
    }

    @Test
    void analyze_shouldProvideSuggestionsForImprovements() {
        Resume r = resume("r1", true, minimalText(), Map.of(
                "email", "a@b.com", "phone", "123",
                "hasExperience", true, "hasEducation", true,
                "skills", List.of("java"),
                "wordCount", 450
        ));
        when(resumeRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of(r));

        ResumeAnalysisResponse result = analysisService.analyze("user1");

        assertFalse(result.suggestions().isEmpty());
    }

    private Resume resume(String id, boolean primary, String text, Map<String, Object> parsed) {
        Resume r = new Resume();
        r.setId(id);
        r.setUserId("user1");
        r.setIsPrimary(primary);
        r.setParsedText(text);
        r.setParsedData(parsed);
        return r;
    }

    private String fullText() {
        return """
                John Doe | linkedin.com/in/johndoe | github.com/johndoe

                SUMMARY
                Experienced backend engineer with 8 years architecting and scaling distributed systems
                across fintech and e-commerce domains. Led cross-functional teams delivering
                mission-critical services handling 2M+ requests per day.

                EXPERIENCE

                Senior Software Engineer — Acme Corp          2020–Present
                • Architected microservices platform that reduced deployment time by 40%
                • Led migration from monolith to event-driven architecture; system now handles 1M+ requests
                • Built distributed caching layer with Redis cutting p99 latency from 800ms to 120ms
                • Mentored 4 junior engineers, improving team velocity by 30%
                • Deployed automated CI/CD pipelines, reducing release cycles by 50%
                • Scaled backend services to 5x traffic without additional infrastructure

                Software Engineer — Beta Systems              2018–2020
                • Developed REST APIs with Spring Boot serving 500k daily sessions
                • Optimized PostgreSQL queries reducing average response time by 60%
                • Implemented containerised services on AWS ECS reducing costs by 35%
                • Collaborated with product team to deliver 3 major features on schedule
                • Engineered event-driven notification system processing 100k+ events per hour
                • Resolved critical production incidents reducing error rate by 25%

                Junior Software Engineer — Gamma Tech         2016–2018
                • Built RESTful services in Java with Spring Framework
                • Integrated payment APIs handling 10k+ daily transactions
                • Automated data pipelines cutting manual processing by 70%
                • Increased unit test coverage from 20% to 80%

                EDUCATION
                Bachelor of Science in Computer Science
                University of Technology, 2016

                PROJECTS
                • Event-Driven Order System: Kafka pipeline with 99% delivery guarantee
                • Real-Time Dashboard: Apache Flink analytics for live metrics
                • Internal CI/CD Framework: adopted by 3 engineering teams

                CERTIFICATIONS
                • AWS Solutions Architect — Associate (2022)
                • Certified Kubernetes Administrator (2023)
                """;
    }

    private String minimalText() {
        return "John Doe. experience education summary linkedin skills java python aws docker";
    }

    private Map<String, Object> fullParsedData() {
        Map<String, Object> contact = new HashMap<>();
        contact.put("email", "john@example.com");
        contact.put("phone", "+1-555-000-0000");
        contact.put("linkedin", "linkedin.com/in/johndoe");
        contact.put("github", "github.com/johndoe");

        Map<String, Object> skills = new HashMap<>();
        skills.put("languages", List.of("Java", "Python", "Go", "TypeScript"));
        skills.put("frameworks", List.of("Spring Boot", "React", "Node.js", "FastAPI"));
        skills.put("databases", List.of("PostgreSQL", "Redis", "MongoDB", "Elasticsearch"));
        skills.put("cloud", List.of("AWS", "Docker", "Kubernetes", "Terraform"));

        Map<String, Object> data = new HashMap<>();
        data.put("contact", contact);
        data.put("skills", skills);
        data.put("hasExperience", true);
        data.put("hasEducation", true);
        data.put("projects", List.of("Event-Driven Order System", "Real-Time Dashboard", "CI/CD Framework"));
        data.put("certifications", List.of("AWS Solutions Architect", "Kubernetes Administrator"));
        data.put("wordCount", 750);
        return data;
    }
}
