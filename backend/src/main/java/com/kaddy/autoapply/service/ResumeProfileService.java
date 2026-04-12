package com.kaddy.autoapply.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.model.ResumeProfile;
import com.kaddy.autoapply.model.ResumeProfile.AchievementTag;
import com.kaddy.autoapply.model.ResumeProfile.CertificationTag;
import com.kaddy.autoapply.model.ResumeProfile.ContactTag;
import com.kaddy.autoapply.model.ResumeProfile.EducationTag;
import com.kaddy.autoapply.model.ResumeProfile.ExperienceTag;
import com.kaddy.autoapply.model.ResumeProfile.PreferencesTag;
import com.kaddy.autoapply.model.ResumeProfile.ProjectTag;
import com.kaddy.autoapply.repository.ResumeProfileRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiTextGenerator;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeProfileService {

    private static final Logger log = LoggerFactory.getLogger(ResumeProfileService.class);

    private static final String SYSTEM_PROMPT = "You are a resume parser. Extract structured data from resume text and return ONLY valid JSON — no markdown, no explanation, no code fences.";

    private static final String USER_PROMPT_TEMPLATE = """
            Parse this resume into JSON with exactly this schema:
            {
              "contact": { "name": string, "email": string, "phone": string, "location": string, "linkedin": string|null, "github": string|null, "portfolio": string|null },
              "headline": string,
              "summary": string,
              "yearsOfExperience": number,
              "experienceLevel": "JUNIOR"|"MID"|"SENIOR"|"LEAD"|"STAFF"|"PRINCIPAL",
              "experience": [ { "company": string, "title": string, "location": string|null, "startDate": "YYYY-MM", "endDate": "YYYY-MM"|null, "current": boolean, "bullets": [string] } ],
              "education": [ { "institution": string, "degree": string, "field": string, "graduationDate": string, "gpa": string|null } ],
              "skills": { "category_name": [string] },
              "projects": [ { "name": string, "description": string, "technologies": [string], "url": string|null } ],
              "certifications": [ { "name": string, "issuer": string, "date": string } ],
              "achievements": [ { "title": string, "description": string|null, "date": string|null } ],
              "targetRoles": [string],
              "preferences": { "noticePeriod": string|null, "salaryMin": number|null, "salaryMax": number|null, "currency": string|null, "workType": string|null }
            }

            Resume text:
            %s
            """;

    private final ResumeProfileRepository repo;
    private final UserRepository userRepository;
    private final AiTextGenerator aiGenerator;
    private final ObjectMapper objectMapper;

    public ResumeProfileService(ResumeProfileRepository repo,
            UserRepository userRepository,
            AiTextGenerator aiGenerator,
            ObjectMapper objectMapper) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.aiGenerator = aiGenerator;
        this.objectMapper = objectMapper;
    }

    public ResumeProfile getOrCreate(String userId) {
        return repo.findByUserId(userId).orElseGet(() -> {
            ResumeProfile blank = new ResumeProfile();
            blank.setUserId(userId);
            return repo.save(blank);
        });
    }

    public ResumeProfile parseAndSave(String userId, String resumeId, String resumeText) {
        ResumeProfile profile = repo.findByUserId(userId).orElseGet(() -> {
            ResumeProfile p = new ResumeProfile();
            p.setUserId(userId);
            return p;
        });

        try {
            String truncated = resumeText.substring(0, Math.min(resumeText.length(), 12000));
            String json = aiGenerator.generate(SYSTEM_PROMPT, String.format(USER_PROMPT_TEMPLATE, truncated));
            String cleaned = stripCodeFences(json);
            Map<String, Object> parsed = objectMapper.readValue(cleaned, new TypeReference<>() {
            });
            applyParsedTags(profile, parsed);
        } catch (Exception e) {
            log.warn("AI resume parse failed for user {}: {} — falling back to basic parse", userId, e.getMessage());
            applyBasicParse(profile, resumeText);
        }

        profile.setSourceResumeId(resumeId);
        profile.setUpdatedAt(LocalDateTime.now());
        profile.setVersion(profile.getVersion() + 1);
        ResumeProfile saved = repo.save(profile);
        syncToUser(userId, saved);
        return saved;
    }

    private void syncToUser(String userId, ResumeProfile profile) {
        userRepository.findById(userId).ifPresent(user -> {
            boolean changed = false;

            ContactTag contact = profile.getContact();
            if (contact != null) {
                if (isBlank(user.getPhone()) && !isBlank(contact.phone())) {
                    user.setPhone(contact.phone());
                    changed = true;
                }
                if (isBlank(user.getLocation()) && !isBlank(contact.location())) {
                    user.setLocation(contact.location());
                    changed = true;
                }
                if (isBlank(user.getLinkedinUrl()) && !isBlank(contact.linkedin())) {
                    user.setLinkedinUrl(contact.linkedin());
                    changed = true;
                }
                if (isBlank(user.getGithubUrl()) && !isBlank(contact.github())) {
                    user.setGithubUrl(contact.github());
                    changed = true;
                }
                if (isBlank(user.getPortfolioUrl()) && !isBlank(contact.portfolio())) {
                    user.setPortfolioUrl(contact.portfolio());
                    changed = true;
                }
            }

            if (isBlank(user.getTitle()) && !isBlank(profile.getHeadline())) {
                user.setTitle(profile.getHeadline());
                changed = true;
            }
            if (isBlank(user.getSummary()) && !isBlank(profile.getSummary())) {
                user.setSummary(profile.getSummary());
                changed = true;
            }
            if (user.getExperienceYears() == 0 && profile.getYearsOfExperience() != null
                    && profile.getYearsOfExperience() > 0) {
                user.setExperienceYears(profile.getYearsOfExperience().intValue());
                changed = true;
            }
            if ((user.getSkills() == null || user.getSkills().isEmpty())
                    && profile.getSkills() != null && !profile.getSkills().isEmpty()) {
                user.setSkills(new HashMap<>(profile.getSkills()));
                changed = true;
            }
            if ((user.getTargetRoles() == null || user.getTargetRoles().isEmpty())
                    && profile.getTargetRoles() != null && !profile.getTargetRoles().isEmpty()) {
                user.setTargetRoles(profile.getTargetRoles());
                changed = true;
            }

            if (changed) {
                user.setUpdatedAt(LocalDateTime.now());
                userRepository.save(user);
                log.info("Synced resume profile fields to user {}", userId);
            }
        });
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public ResumeProfile patch(String userId, Map<String, Object> updates) {
        ResumeProfile profile = getOrCreate(userId);
        applyParsedTags(profile, updates);
        profile.setUpdatedAt(LocalDateTime.now());
        return repo.save(profile);
    }

    @SuppressWarnings("unchecked")
    private void applyParsedTags(ResumeProfile p, Map<String, Object> m) {
        safeMap(m, "contact").ifPresent(c -> p.setContact(new ContactTag(
                str(c, "name"), str(c, "email"), str(c, "phone"),
                str(c, "location"), str(c, "linkedin"), str(c, "github"), str(c, "portfolio"))));

        if (m.containsKey("headline"))
            p.setHeadline(str(m, "headline"));
        if (m.containsKey("summary"))
            p.setSummary(str(m, "summary"));
        if (m.containsKey("yearsOfExperience"))
            p.setYearsOfExperience(toDouble(m.get("yearsOfExperience")));
        if (m.containsKey("experienceLevel"))
            p.setExperienceLevel(str(m, "experienceLevel"));
        if (m.containsKey("targetRoles"))
            p.setTargetRoles(toStringList(m.get("targetRoles")));

        if (m.containsKey("experience")) {
            List<Map<String, Object>> list = (List<Map<String, Object>>) m.get("experience");
            if (list != null) {
                p.setExperience(list.stream().map(e -> new ExperienceTag(
                        str(e, "company"), str(e, "title"), str(e, "location"),
                        str(e, "startDate"), str(e, "endDate"),
                        Boolean.TRUE.equals(e.get("current")),
                        toStringList(e.get("bullets")))).toList());
            }
        }

        if (m.containsKey("education")) {
            List<Map<String, Object>> list = (List<Map<String, Object>>) m.get("education");
            if (list != null) {
                p.setEducation(list.stream().map(e -> new EducationTag(
                        str(e, "institution"), str(e, "degree"), str(e, "field"),
                        str(e, "graduationDate"), str(e, "gpa"))).toList());
            }
        }

        if (m.get("skills") instanceof Map<?, ?> rawMap) {
            Map<String, List<String>> skills = new HashMap<>();
            rawMap.forEach((k, v) -> skills.put(k.toString(), toStringList(v)));
            p.setSkills(skills);
        }

        if (m.containsKey("projects")) {
            List<Map<String, Object>> list = (List<Map<String, Object>>) m.get("projects");
            if (list != null) {
                p.setProjects(list.stream().map(e -> new ProjectTag(
                        str(e, "name"), str(e, "description"),
                        toStringList(e.get("technologies")), str(e, "url"))).toList());
            }
        }

        if (m.containsKey("certifications")) {
            List<Map<String, Object>> list = (List<Map<String, Object>>) m.get("certifications");
            if (list != null) {
                p.setCertifications(list.stream().map(e -> new CertificationTag(
                        str(e, "name"), str(e, "issuer"), str(e, "date"))).toList());
            }
        }

        if (m.containsKey("achievements")) {
            List<Map<String, Object>> list = (List<Map<String, Object>>) m.get("achievements");
            if (list != null) {
                p.setAchievements(list.stream().map(e -> new AchievementTag(
                        str(e, "title"), str(e, "description"), str(e, "date"))).toList());
            }
        }

        safeMap(m, "preferences").ifPresent(pref -> p.setPreferences(new PreferencesTag(
                str(pref, "noticePeriod"),
                toLong(pref.get("salaryMin")), toLong(pref.get("salaryMax")),
                str(pref, "currency"), str(pref, "workType"))));
    }

    private void applyBasicParse(ResumeProfile p, String text) {
        String lower = text.toLowerCase();
        List<String> skillTokens = List.of(
                "java", "python", "javascript", "typescript", "spring boot", "react",
                "node.js", "postgresql", "mongodb", "redis", "aws", "gcp", "docker", "kubernetes");
        List<String> found = skillTokens.stream().filter(lower::contains).toList();
        if (!found.isEmpty()) {
            p.setSkills(Map.of("detected", found));
        }
    }

    private String stripCodeFences(String s) {
        if (s == null)
            return "{}";
        s = s.strip();
        if (s.startsWith("```")) {
            s = s.replaceFirst("```[a-zA-Z]*", "").replaceAll("```$", "").strip();
        }
        int start = s.indexOf('{');
        int end = s.lastIndexOf('}');
        return (start >= 0 && end > start) ? s.substring(start, end + 1) : "{}";
    }

    @SuppressWarnings("unchecked")
    private java.util.Optional<Map<String, Object>> safeMap(Map<String, Object> m, String key) {
        if (m == null)
            return java.util.Optional.empty();
        Object v = m.get(key);
        if (v instanceof Map<?, ?> raw) {
            return java.util.Optional.of((Map<String, Object>) raw);
        }
        return java.util.Optional.empty();
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m == null ? null : m.get(key);
        return v instanceof String s ? s : null;
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object v) {
        if (v instanceof List<?> list)
            return list.stream().filter(i -> i instanceof String).map(Object::toString).toList();
        return List.of();
    }

    private Double toDouble(Object v) {
        if (v instanceof Number n)
            return n.doubleValue();
        if (v instanceof String s) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private Long toLong(Object v) {
        if (v instanceof Number n)
            return n.longValue();
        return null;
    }
}
