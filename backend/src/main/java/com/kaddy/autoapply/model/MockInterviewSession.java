package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "mock_interview_sessions")
public class MockInterviewSession {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String jobTitle;
    private String company;
    private String jobDescription;
    private String difficultyLevel; // ENTRY, MID, SENIOR, LEAD

    private List<QA> questionsAndAnswers;

    private int overallScore;      // 0-100
    private String overallFeedback;
    private String strengths;
    private String improvements;

    private String status;         // IN_PROGRESS, COMPLETED

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public record QA(
            int index,
            String question,
            String category,       // BEHAVIORAL, TECHNICAL, SITUATIONAL, CULTURE_FIT
            String idealAnswer,    // AI-generated ideal answer shown after submission
            String userAnswer,
            int score,             // 0-10
            String feedback
    ) {}

    public MockInterviewSession() {
        this.status    = "IN_PROGRESS";
        this.startedAt = LocalDateTime.now();
    }

    public String getId()                          { return id; }
    public String getUserId()                      { return userId; }
    public String getJobTitle()                    { return jobTitle; }
    public String getCompany()                     { return company; }
    public String getJobDescription()              { return jobDescription; }
    public String getDifficultyLevel()             { return difficultyLevel; }
    public List<QA> getQuestionsAndAnswers()       { return questionsAndAnswers; }
    public int getOverallScore()                   { return overallScore; }
    public String getOverallFeedback()             { return overallFeedback; }
    public String getStrengths()                   { return strengths; }
    public String getImprovements()                { return improvements; }
    public String getStatus()                      { return status; }
    public LocalDateTime getStartedAt()            { return startedAt; }
    public LocalDateTime getCompletedAt()          { return completedAt; }

    public void setId(String id)                                  { this.id = id; }
    public void setUserId(String userId)                          { this.userId = userId; }
    public void setJobTitle(String jobTitle)                      { this.jobTitle = jobTitle; }
    public void setCompany(String company)                        { this.company = company; }
    public void setJobDescription(String jobDescription)          { this.jobDescription = jobDescription; }
    public void setDifficultyLevel(String difficultyLevel)        { this.difficultyLevel = difficultyLevel; }
    public void setQuestionsAndAnswers(List<QA> qas)              { this.questionsAndAnswers = qas; }
    public void setOverallScore(int overallScore)                  { this.overallScore = overallScore; }
    public void setOverallFeedback(String overallFeedback)        { this.overallFeedback = overallFeedback; }
    public void setStrengths(String strengths)                    { this.strengths = strengths; }
    public void setImprovements(String improvements)              { this.improvements = improvements; }
    public void setStatus(String status)                          { this.status = status; }
    public void setStartedAt(LocalDateTime startedAt)             { this.startedAt = startedAt; }
    public void setCompletedAt(LocalDateTime completedAt)         { this.completedAt = completedAt; }
}
