package com.kaddy.autoapply.model;

import com.kaddy.autoapply.model.enums.ApplicationStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Document(collection = "applications")
@CompoundIndex(name = "user_job", def = "{'userId': 1, 'jobId': 1}", unique = true)
public class Application {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String jobId;

    private String coverLetterId;
    private String resumeId;
    private ApplicationStatus status;
    private BigDecimal matchScore;
    private String notes;
    private LocalDateTime appliedAt;
    private LocalDateTime statusUpdated;

    private InterviewDetails interviewDetails;
    private OfferDetails offerDetails;

    public Application() {
        this.status = ApplicationStatus.APPLIED;
        this.appliedAt = LocalDateTime.now();
        this.statusUpdated = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getJobId() { return jobId; }
    public String getCoverLetterId() { return coverLetterId; }
    public String getResumeId() { return resumeId; }
    public ApplicationStatus getStatus() { return status; }
    public BigDecimal getMatchScore() { return matchScore; }
    public String getNotes() { return notes; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
    public LocalDateTime getStatusUpdated() { return statusUpdated; }
    public InterviewDetails getInterviewDetails() { return interviewDetails; }
    public OfferDetails getOfferDetails() { return offerDetails; }

    public void setId(String id) { this.id = id; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
    public void setCoverLetterId(String coverLetterId) { this.coverLetterId = coverLetterId; }
    public void setResumeId(String resumeId) { this.resumeId = resumeId; }
    public void setStatus(ApplicationStatus status) { this.status = status; }
    public void setMatchScore(BigDecimal matchScore) { this.matchScore = matchScore; }
    public void setNotes(String notes) { this.notes = notes; }
    public void setAppliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; }
    public void setStatusUpdated(LocalDateTime statusUpdated) { this.statusUpdated = statusUpdated; }
    public void setInterviewDetails(InterviewDetails interviewDetails) { this.interviewDetails = interviewDetails; }
    public void setOfferDetails(OfferDetails offerDetails) { this.offerDetails = offerDetails; }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {

        private String id, userId, jobId, coverLetterId, resumeId, notes;
        private ApplicationStatus status = ApplicationStatus.APPLIED;
        private BigDecimal matchScore;
        private LocalDateTime appliedAt, statusUpdated;
        private InterviewDetails interviewDetails;
        private OfferDetails offerDetails;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder jobId(String jobId) { this.jobId = jobId; return this; }
        public Builder coverLetterId(String coverLetterId) { this.coverLetterId = coverLetterId; return this; }
        public Builder resumeId(String resumeId) { this.resumeId = resumeId; return this; }
        public Builder status(ApplicationStatus status) { this.status = status; return this; }
        public Builder matchScore(BigDecimal matchScore) { this.matchScore = matchScore; return this; }
        public Builder notes(String notes) { this.notes = notes; return this; }
        public Builder appliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; return this; }
        public Builder statusUpdated(LocalDateTime statusUpdated) { this.statusUpdated = statusUpdated; return this; }
        public Builder interviewDetails(InterviewDetails interviewDetails) { this.interviewDetails = interviewDetails; return this; }
        public Builder offerDetails(OfferDetails offerDetails) { this.offerDetails = offerDetails; return this; }

        public Application build() {
            Application app = new Application();
            app.id = id;
            app.userId = userId;
            app.jobId = jobId;
            app.coverLetterId = coverLetterId;
            app.resumeId = resumeId;
            app.status = status;
            app.matchScore = matchScore;
            app.notes = notes;
            app.appliedAt = Optional.ofNullable(appliedAt).orElseGet(LocalDateTime::now);
            app.statusUpdated = Optional.ofNullable(statusUpdated).orElseGet(LocalDateTime::now);
            app.interviewDetails = interviewDetails;
            app.offerDetails = offerDetails;
            return app;
        }
    }
}
