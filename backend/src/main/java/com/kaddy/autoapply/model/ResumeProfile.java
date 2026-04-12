package com.kaddy.autoapply.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "resume_profiles")
public class ResumeProfile {

        public static final String TAG_CONTACT = "contact";
        public static final String TAG_HEADLINE = "headline";
        public static final String TAG_SUMMARY = "summary";
        public static final String TAG_YEARS_XP = "yearsOfExperience";
        public static final String TAG_XP_LEVEL = "experienceLevel";
        public static final String TAG_EXPERIENCE = "experience";
        public static final String TAG_EDUCATION = "education";
        public static final String TAG_SKILLS = "skills";
        public static final String TAG_PROJECTS = "projects";
        public static final String TAG_CERTIFICATIONS = "certifications";
        public static final String TAG_ACHIEVEMENTS = "achievements";
        public static final String TAG_TARGET_ROLES = "targetRoles";
        public static final String TAG_PREFERENCES = "preferences";

        @Id
        private String id;

        @Indexed(unique = true)
        private String userId;

        private int version = 1;
        private LocalDateTime updatedAt = LocalDateTime.now();
        private String sourceResumeId;

        private ContactTag contact;
        private String headline;
        private String summary;
        private Double yearsOfExperience;
        private String experienceLevel;

        private List<ExperienceTag> experience;
        private List<EducationTag> education;
        private Map<String, List<String>> skills;
        private List<ProjectTag> projects;
        private List<CertificationTag> certifications;
        private List<AchievementTag> achievements;

        private List<String> targetRoles;
        private List<String> skipKeywords;

        private PreferencesTag preferences;

        private Map<String, Object> customTags;

        public record ContactTag(
                        String name,
                        String email,
                        String phone,
                        String location,
                        String linkedin,
                        String github,
                        String portfolio) {
        }

        public record ExperienceTag(
                        String company,
                        String title,
                        String location,
                        String startDate,
                        String endDate,
                        boolean current,
                        List<String> bullets) {
        }

        public record EducationTag(
                        String institution,
                        String degree,
                        String field,
                        String graduationDate,
                        String gpa) {
        }

        public record ProjectTag(
                        String name,
                        String description,
                        List<String> technologies,
                        String url) {
        }

        public record CertificationTag(
                        String name,
                        String issuer,
                        String date) {
        }

        public record AchievementTag(
                        String title,
                        String description,
                        String date) {
        }

        public record PreferencesTag(
                        String noticePeriod,
                        Long salaryMin,
                        Long salaryMax,
                        String currency,
                        String workType) {
        }

        public String getId() {
                return id;
        }

        public String getUserId() {
                return userId;
        }

        public int getVersion() {
                return version;
        }

        public LocalDateTime getUpdatedAt() {
                return updatedAt;
        }

        public String getSourceResumeId() {
                return sourceResumeId;
        }

        public ContactTag getContact() {
                return contact;
        }

        public String getHeadline() {
                return headline;
        }

        public String getSummary() {
                return summary;
        }

        public Double getYearsOfExperience() {
                return yearsOfExperience;
        }

        public String getExperienceLevel() {
                return experienceLevel;
        }

        public List<ExperienceTag> getExperience() {
                return experience;
        }

        public List<EducationTag> getEducation() {
                return education;
        }

        public Map<String, List<String>> getSkills() {
                return skills;
        }

        public List<ProjectTag> getProjects() {
                return projects;
        }

        public List<CertificationTag> getCertifications() {
                return certifications;
        }

        public List<AchievementTag> getAchievements() {
                return achievements;
        }

        public List<String> getTargetRoles() {
                return targetRoles;
        }

        public List<String> getSkipKeywords() {
                return skipKeywords;
        }

        public PreferencesTag getPreferences() {
                return preferences;
        }

        public Map<String, Object> getCustomTags() {
                return customTags;
        }

        public void setId(String id) {
                this.id = id;
        }

        public void setUserId(String userId) {
                this.userId = userId;
        }

        public void setVersion(int version) {
                this.version = version;
        }

        public void setUpdatedAt(LocalDateTime updatedAt) {
                this.updatedAt = updatedAt;
        }

        public void setSourceResumeId(String sourceResumeId) {
                this.sourceResumeId = sourceResumeId;
        }

        public void setContact(ContactTag contact) {
                this.contact = contact;
        }

        public void setHeadline(String headline) {
                this.headline = headline;
        }

        public void setSummary(String summary) {
                this.summary = summary;
        }

        public void setYearsOfExperience(Double yearsOfExperience) {
                this.yearsOfExperience = yearsOfExperience;
        }

        public void setExperienceLevel(String experienceLevel) {
                this.experienceLevel = experienceLevel;
        }

        public void setExperience(List<ExperienceTag> experience) {
                this.experience = experience;
        }

        public void setEducation(List<EducationTag> education) {
                this.education = education;
        }

        public void setSkills(Map<String, List<String>> skills) {
                this.skills = skills;
        }

        public void setProjects(List<ProjectTag> projects) {
                this.projects = projects;
        }

        public void setCertifications(List<CertificationTag> certifications) {
                this.certifications = certifications;
        }

        public void setAchievements(List<AchievementTag> achievements) {
                this.achievements = achievements;
        }

        public void setTargetRoles(List<String> targetRoles) {
                this.targetRoles = targetRoles;
        }

        public void setSkipKeywords(List<String> skipKeywords) {
                this.skipKeywords = skipKeywords;
        }

        public void setPreferences(PreferencesTag preferences) {
                this.preferences = preferences;
        }

        public void setCustomTags(Map<String, Object> customTags) {
                this.customTags = customTags;
        }
}
