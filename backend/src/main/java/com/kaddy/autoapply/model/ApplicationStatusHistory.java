package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "application_status_history")
public class ApplicationStatusHistory {

    @Id
    private String id;

    @Indexed
    private String applicationId;

    private String oldStatus;
    private String newStatus;
    private String notes;
    private LocalDateTime changedAt;

    public ApplicationStatusHistory() {
        this.changedAt = LocalDateTime.now();
    }

    public ApplicationStatusHistory(String id, String applicationId, String oldStatus,
                                    String newStatus, String notes, LocalDateTime changedAt) {
        this.id = id;
        this.applicationId = applicationId;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.notes = notes;
        this.changedAt = changedAt;
    }

    public String getId() { return id; }
    public String getApplicationId() { return applicationId; }
    public String getOldStatus() { return oldStatus; }
    public String getNewStatus() { return newStatus; }
    public String getNotes() { return notes; }
    public LocalDateTime getChangedAt() { return changedAt; }

    public void setId(String id) { this.id = id; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }
    public void setOldStatus(String oldStatus) { this.oldStatus = oldStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }
    public void setNotes(String notes) { this.notes = notes; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String applicationId;
        private String oldStatus;
        private String newStatus;
        private String notes;
        private LocalDateTime changedAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder applicationId(String applicationId) { this.applicationId = applicationId; return this; }
        public Builder oldStatus(String oldStatus) { this.oldStatus = oldStatus; return this; }
        public Builder newStatus(String newStatus) { this.newStatus = newStatus; return this; }
        public Builder notes(String notes) { this.notes = notes; return this; }
        public Builder changedAt(LocalDateTime changedAt) { this.changedAt = changedAt; return this; }

        public ApplicationStatusHistory build() {
            ApplicationStatusHistory h = new ApplicationStatusHistory();
            h.id = this.id;
            h.applicationId = this.applicationId;
            h.oldStatus = this.oldStatus;
            h.newStatus = this.newStatus;
            h.notes = this.notes;
            h.changedAt = this.changedAt != null ? this.changedAt : LocalDateTime.now();
            return h;
        }
    }
}
