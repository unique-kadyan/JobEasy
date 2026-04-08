package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "generated_resumes")
public class GeneratedResume {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String sourceResumeId;
    private Map<String, Object> resumeData;
    private int atsScore;
    private boolean paid;
    private String paymentId;
    private LocalDateTime generatedAt;

    public GeneratedResume() {
        this.paid = false;
        this.generatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getSourceResumeId() { return sourceResumeId; }
    public Map<String, Object> getResumeData() { return resumeData; }
    public int getAtsScore() { return atsScore; }
    public boolean isPaid() { return paid; }
    public String getPaymentId() { return paymentId; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }

    public void setId(String id) { this.id = id; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setSourceResumeId(String sourceResumeId) { this.sourceResumeId = sourceResumeId; }
    public void setResumeData(Map<String, Object> resumeData) { this.resumeData = resumeData; }
    public void setAtsScore(int atsScore) { this.atsScore = atsScore; }
    public void setPaid(boolean paid) { this.paid = paid; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
}
