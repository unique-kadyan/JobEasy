package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Optional;

@Document(collection = "templates")
public class Template {

    @Id
    private String id;

    private String userId;
    private String name;
    private String content;
    private String description;
    private Boolean isSystem;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Template() {
        this.isSystem = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Template(String id, String userId, String name, String content, String description,
                    Boolean isSystem, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.content = content;
        this.description = description;
        this.isSystem = isSystem;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getName() { return name; }
    public String getContent() { return content; }
    public String getDescription() { return description; }
    public Boolean getIsSystem() { return isSystem; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(String id) { this.id = id; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setName(String name) { this.name = name; }
    public void setContent(String content) { this.content = content; }
    public void setDescription(String description) { this.description = description; }
    public void setIsSystem(Boolean isSystem) { this.isSystem = isSystem; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String userId;
        private String name;
        private String content;
        private String description;
        private Boolean isSystem = false;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder isSystem(Boolean isSystem) { this.isSystem = isSystem; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public Template build() {
            Template template = new Template();
            template.id = this.id;
            template.userId = this.userId;
            template.name = this.name;
            template.content = this.content;
            template.description = this.description;
            template.isSystem = this.isSystem;
            template.createdAt = Optional.ofNullable(this.createdAt).orElseGet(LocalDateTime::now);
            template.updatedAt = Optional.ofNullable(this.updatedAt).orElseGet(LocalDateTime::now);
            return template;
        }
    }
}
