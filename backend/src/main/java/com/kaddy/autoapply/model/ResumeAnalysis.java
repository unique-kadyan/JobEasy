package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "resume_analyses")
public class ResumeAnalysis {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String resumeId;
    private int atsScore;
    private List<String> missingFields;
    private List<String> suggestions;
    private List<String> strengths;
    private String lengthAssessment;
    private int wordCount;
    private LocalDateTime analyzedAt;

    public ResumeAnalysis() {
        this.analyzedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getResumeId() { return resumeId; }
    public int getAtsScore() { return atsScore; }
    public List<String> getMissingFields() { return missingFields; }
    public List<String> getSuggestions() { return suggestions; }
    public List<String> getStrengths() { return strengths; }
    public String getLengthAssessment() { return lengthAssessment; }
    public int getWordCount() { return wordCount; }
    public LocalDateTime getAnalyzedAt() { return analyzedAt; }

    public void setId(String id) { this.id = id; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setResumeId(String resumeId) { this.resumeId = resumeId; }
    public void setAtsScore(int atsScore) { this.atsScore = atsScore; }
    public void setMissingFields(List<String> missingFields) { this.missingFields = missingFields; }
    public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
    public void setStrengths(List<String> strengths) { this.strengths = strengths; }
    public void setLengthAssessment(String lengthAssessment) { this.lengthAssessment = lengthAssessment; }
    public void setWordCount(int wordCount) { this.wordCount = wordCount; }
    public void setAnalyzedAt(LocalDateTime analyzedAt) { this.analyzedAt = analyzedAt; }
}
