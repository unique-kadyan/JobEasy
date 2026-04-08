package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "cover_letters")
public class CoverLetter {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String jobId;

    private String templateId;
    private String content;
    private String aiProvider;
    private String aiModel;
    private String promptUsed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CoverLetter() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public CoverLetter(String id, String userId, String jobId, String templateId,
                       String content, String aiProvider, String aiModel, String promptUsed,
                       LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.jobId = jobId;
        this.templateId = templateId;
        this.content = content;
        this.aiProvider = aiProvider;
        this.aiModel = aiModel;
        this.promptUsed = promptUsed;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getJobId() { return jobId; }
    public String getTemplateId() { return templateId; }
    public String getContent() { return content; }
    public String getAiProvider() { return aiProvider; }
    public String getAiModel() { return aiModel; }
    public String getPromptUsed() { return promptUsed; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(String id) { this.id = id; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }
    public void setContent(String content) { this.content = content; }
    public void setAiProvider(String aiProvider) { this.aiProvider = aiProvider; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }
    public void setPromptUsed(String promptUsed) { this.promptUsed = promptUsed; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String userId;
        private String jobId;
        private String templateId;
        private String content;
        private String aiProvider;
        private String aiModel;
        private String promptUsed;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder jobId(String jobId) { this.jobId = jobId; return this; }
        public Builder templateId(String templateId) { this.templateId = templateId; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder aiProvider(String aiProvider) { this.aiProvider = aiProvider; return this; }
        public Builder aiModel(String aiModel) { this.aiModel = aiModel; return this; }
        public Builder promptUsed(String promptUsed) { this.promptUsed = promptUsed; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public CoverLetter build() {
            CoverLetter cl = new CoverLetter();
            cl.id = this.id;
            cl.userId = this.userId;
            cl.jobId = this.jobId;
            cl.templateId = this.templateId;
            cl.content = this.content;
            cl.aiProvider = this.aiProvider;
            cl.aiModel = this.aiModel;
            cl.promptUsed = this.promptUsed;
            cl.createdAt = this.createdAt != null ? this.createdAt : LocalDateTime.now();
            cl.updatedAt = this.updatedAt != null ? this.updatedAt : LocalDateTime.now();
            return cl;
        }
    }
}
