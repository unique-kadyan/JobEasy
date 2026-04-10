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
        assertTrue(result.missingFields().contains("Professional summary / objective"));
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
                John Doe | john@example.com | +1-555-000-0000

                Summary: Experienced software engineer with 8 years building scalable systems.

                Experience:
                Led a team of 5 engineers. Built microservices that improved performance by 40%.
                Developed REST APIs using Spring Boot. Increased user retention by 25%.
                Managed cloud infrastructure on AWS. Reduced costs by 30%.

                Education:
                Bachelor of Computer Science, University of Technology, 2015

                Skills: Java, Python, Spring Boot, AWS, Docker, Kubernetes

                Projects: E-commerce platform, Analytics dashboard, CI/CD pipeline

                Certifications: AWS Solutions Architect

                LinkedIn: linkedin.com/in/johndoe
                """;
    }

    private String minimalText() {
        return "John Doe. experience education summary linkedin skills java python aws docker";
    }

    private Map<String, Object> fullParsedData() {
        return Map.of(
                "email", "john@example.com",
                "phone", "+1-555-000-0000",
                "skills", List.of("java", "python", "aws", "docker"),
                "hasExperience", true,
                "hasEducation", true,
                "hasProjects", true,
                "hasCertifications", true,
                "wordCount", 520
        );
    }
}
