package com.kaddy.autoapply.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.exception.AiServiceException;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeParserServiceTest {

    @Mock
    private AiProviderFactory aiProviderFactory;

    private ResumeParserService parser;

    @BeforeEach
    void setUp() {
        // Simulate all AI providers being unavailable so tests exercise the regex fallback path.
        when(aiProviderFactory.generate(anyString(), anyString(), any(AiProviderFactory.TaskType.class)))
                .thenThrow(new AiServiceException("No AI providers available (test)"));
        parser = new ResumeParserService(aiProviderFactory, new ObjectMapper());
    }

    @Test
    void parseStructuredData_shouldExtractEmail() {
        Map<String, Object> data = parser.parseStructuredData(
                "John Doe\njohn@example.com\n+1-555-123-4567\nExperience with Java and Python"
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> contact = (Map<String, Object>) data.get("contact");
        assertNotNull(contact);
        assertEquals("john@example.com", contact.get("email"));
    }

    @Test
    void parseStructuredData_shouldExtractPhone() {
        Map<String, Object> data = parser.parseStructuredData(
                "Jane Smith\nContact: 555-123-4567"
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> contact = (Map<String, Object>) data.get("contact");
        assertNotNull(contact);
        assertNotNull(contact.get("phone"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void parseStructuredData_shouldExtractSkillsByCategory() {
        Map<String, Object> data = parser.parseStructuredData(
                "Skills: Java, Python, React, Spring Boot, Docker, AWS"
        );

        Map<String, List<String>> skills = (Map<String, List<String>>) data.get("skills");
        assertNotNull(skills);
        assertTrue(skills.containsKey("technical"));
        assertTrue(skills.containsKey("frameworks"));
        assertTrue(skills.containsKey("cloud"));
        assertTrue(skills.containsKey("tools"));
        assertTrue(skills.get("technical").contains("java"));
        assertTrue(skills.get("technical").contains("python"));
        assertTrue(skills.get("frameworks").contains("react"));
        assertTrue(skills.get("tools").contains("docker"));
        assertTrue(skills.get("cloud").contains("aws"));
    }

    @Test
    void parseStructuredData_shouldReturnConsistentStructureKeys() {
        Map<String, Object> data = parser.parseStructuredData("Some resume text");

        assertTrue(data.containsKey("contact"));
        assertTrue(data.containsKey("summary"));
        assertTrue(data.containsKey("experience"));
        assertTrue(data.containsKey("education"));
        assertTrue(data.containsKey("skills"));
        assertTrue(data.containsKey("projects"));
        assertTrue(data.containsKey("certifications"));
        assertTrue(data.containsKey("wordCount"));
        assertTrue(data.containsKey("experienceYears"));
    }

    @Test
    void parseStructuredData_shouldCountWords() {
        Map<String, Object> data = parser.parseStructuredData("one two three four five");
        assertEquals(5, data.get("wordCount"));
    }
}
