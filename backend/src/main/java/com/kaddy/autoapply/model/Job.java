package com.kaddy.autoapply.model;

import com.kaddy.autoapply.model.enums.JobSource;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "jobs")
@CompoundIndex(name = "source_externalId", def = "{'source': 1, 'externalId': 1}", unique = true)
public class Job {

    @Id
    private String id;

    private String externalId;

    @Indexed
    private JobSource source;

    @TextIndexed(weight = 10)
    private String title;

    private String company;
    private String location;
    private String url;

    @TextIndexed
    private String description;

    private String salary;
    private List<String> tags;
    private String jobType;
    private LocalDateTime datePosted;
    private LocalDateTime scrapedAt;
    private LocalDateTime expiresAt;

    public Job() {
        this.scrapedAt = LocalDateTime.now();
    }

    public Job(String id, String externalId, JobSource source, String title, String company,
               String location, String url, String description, String salary,
               List<String> tags, String jobType, LocalDateTime datePosted,
               LocalDateTime scrapedAt, LocalDateTime expiresAt) {
        this.id = id;
        this.externalId = externalId;
        this.source = source;
        this.title = title;
        this.company = company;
        this.location = location;
        this.url = url;
        this.description = description;
        this.salary = salary;
        this.tags = tags;
        this.jobType = jobType;
        this.datePosted = datePosted;
        this.scrapedAt = scrapedAt;
        this.expiresAt = expiresAt;
    }

    public String getId() { return id; }
    public String getExternalId() { return externalId; }
    public JobSource getSource() { return source; }
    public String getTitle() { return title; }
    public String getCompany() { return company; }
    public String getLocation() { return location; }
    public String getUrl() { return url; }
    public String getDescription() { return description; }
    public String getSalary() { return salary; }
    public List<String> getTags() { return tags; }
    public String getJobType() { return jobType; }
    public LocalDateTime getDatePosted() { return datePosted; }
    public LocalDateTime getScrapedAt() { return scrapedAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }

    public void setId(String id) { this.id = id; }
    public void setExternalId(String externalId) { this.externalId = externalId; }
    public void setSource(JobSource source) { this.source = source; }
    public void setTitle(String title) { this.title = title; }
    public void setCompany(String company) { this.company = company; }
    public void setLocation(String location) { this.location = location; }
    public void setUrl(String url) { this.url = url; }
    public void setDescription(String description) { this.description = description; }
    public void setSalary(String salary) { this.salary = salary; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public void setJobType(String jobType) { this.jobType = jobType; }
    public void setDatePosted(LocalDateTime datePosted) { this.datePosted = datePosted; }
    public void setScrapedAt(LocalDateTime scrapedAt) { this.scrapedAt = scrapedAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String id;
        private String externalId;
        private JobSource source;
        private String title;
        private String company;
        private String location;
        private String url;
        private String description;
        private String salary;
        private List<String> tags;
        private String jobType;
        private LocalDateTime datePosted;
        private LocalDateTime scrapedAt;
        private LocalDateTime expiresAt;

        private Builder() {}

        public Builder id(String id) { this.id = id; return this; }
        public Builder externalId(String externalId) { this.externalId = externalId; return this; }
        public Builder source(JobSource source) { this.source = source; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder company(String company) { this.company = company; return this; }
        public Builder location(String location) { this.location = location; return this; }
        public Builder url(String url) { this.url = url; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder salary(String salary) { this.salary = salary; return this; }
        public Builder tags(List<String> tags) { this.tags = tags; return this; }
        public Builder jobType(String jobType) { this.jobType = jobType; return this; }
        public Builder datePosted(LocalDateTime datePosted) { this.datePosted = datePosted; return this; }
        public Builder scrapedAt(LocalDateTime scrapedAt) { this.scrapedAt = scrapedAt; return this; }
        public Builder expiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; return this; }

        public Job build() {
            Job job = new Job();
            job.id = this.id;
            job.externalId = this.externalId;
            job.source = this.source;
            job.title = this.title;
            job.company = this.company;
            job.location = this.location;
            job.url = this.url;
            job.description = this.description;
            job.salary = this.salary;
            job.tags = this.tags;
            job.jobType = this.jobType;
            job.datePosted = this.datePosted;
            job.scrapedAt = this.scrapedAt != null ? this.scrapedAt : LocalDateTime.now();
            job.expiresAt = this.expiresAt;
            return job;
        }
    }
}
