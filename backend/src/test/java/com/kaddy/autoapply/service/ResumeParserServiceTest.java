package com.kaddy.autoapply.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ResumeParserServiceTest {

    private final ResumeParserService parser = new ResumeParserService();

    @Test
    void parseStructuredData_shouldExtractEmail() {
        Map<String, Object> data = parser.parseStructuredData(
                "John Doe\njohn@example.com\n+1-555-123-4567\nExperience with Java and Python"
        );

        assertEquals("john@example.com", data.get("email"));
    }

    @Test
    void parseStructuredData_shouldExtractPhone() {
        Map<String, Object> data = parser.parseStructuredData(
                "Contact: 555-123-4567"
        );

        assertNotNull(data.get("phone"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void parseStructuredData_shouldExtractSkills() {
        Map<String, Object> data = parser.parseStructuredData(
                "Skills: Java, Python, React, Spring Boot, Docker, AWS"
        );

        List<String> skills = (List<String>) data.get("skills");
        assertNotNull(skills);
        assertTrue(skills.contains("java"));
        assertTrue(skills.contains("python"));
        assertTrue(skills.contains("react"));
        assertTrue(skills.contains("docker"));
    }

    @Test
    void parseStructuredData_shouldDetectSections() {
        Map<String, Object> data = parser.parseStructuredData(
                "Education\nBS Computer Science\nExperience\nSoftware Engineer\nProjects\nOpen source"
        );

        assertEquals(true, data.get("hasExperience"));
        assertEquals(true, data.get("hasEducation"));
        assertEquals(true, data.get("hasProjects"));
    }

    @Test
    void parseStructuredData_shouldCountWords() {
        Map<String, Object> data = parser.parseStructuredData("one two three four five");
        assertEquals(5, data.get("wordCount"));
    }
}
