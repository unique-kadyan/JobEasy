package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Document(collection = "resumes")
public class Resume {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String filename;
    private String filePath;
    private Integer fileSize;
    private String contentType;
    private String parsedText;
    private Map<String, Object> parsedData;
    private Boolean isPrimary;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Resume() {
        this.isPrimary = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Resume(String id, String userId, String filename, String filePath,
                  Integer fileSize, String contentType, String parsedText,
                  Map<String, Object> parsedData, Boolean isPrimary,
                  LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.filename = filename;
        this.filePath = filePath;
        this.fileSize = fileSize;
        this.contentType = contentType;
        this.parsedText = parsedText;
        this.parsedData = parsedData;
        this.isPrimary = isPrimary;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getFilename() { return filename; }
    public String getFilePath() { return filePath; }
    public Integer getFileSize() { return fileSize; }
    public String getContentType() { return contentType; }
    public String getParsedText() { return parsedText; }
    public Map<String, Object> getParsedData() { return parsedData; }
    public Boolean getIsPrimary() { return isPrimary; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(String id) { this.id = id; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setFilename(String filename) { this.filename = filename; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public void setFileSize(Integer fileSize) { this.fileSize = fileSize; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public void setParsedText(String parsedText) { this.parsedText = parsedText; }
    public void setParsedData(Map<String, Object> parsedData) { this.parsedData = parsedData; }
    public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String userId;
        private String filename;
        private String filePath;
        private Integer fileSize;
        private String contentType;
        private String parsedText;
        private Map<String, Object> parsedData;
        private Boolean isPrimary = false;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder filename(String filename) { this.filename = filename; return this; }
        public Builder filePath(String filePath) { this.filePath = filePath; return this; }
        public Builder fileSize(Integer fileSize) { this.fileSize = fileSize; return this; }
        public Builder contentType(String contentType) { this.contentType = contentType; return this; }
        public Builder parsedText(String parsedText) { this.parsedText = parsedText; return this; }
        public Builder parsedData(Map<String, Object> parsedData) { this.parsedData = parsedData; return this; }
        public Builder isPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public Resume build() {
            Resume resume = new Resume();
            resume.id = this.id;
            resume.userId = this.userId;
            resume.filename = this.filename;
            resume.filePath = this.filePath;
            resume.fileSize = this.fileSize;
            resume.contentType = this.contentType;
            resume.parsedText = this.parsedText;
            resume.parsedData = this.parsedData;
            resume.isPrimary = this.isPrimary;
            resume.createdAt = Optional.ofNullable(this.createdAt).orElseGet(LocalDateTime::now);
            resume.updatedAt = Optional.ofNullable(this.updatedAt).orElseGet(LocalDateTime::now);
            return resume;
        }
    }
}
