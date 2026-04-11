package com.kaddy.autoapply.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.config.FeatureConfig;
import com.kaddy.autoapply.dto.response.CareerPathResponse;
import com.kaddy.autoapply.exception.AiServiceException;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.ResumeProfile;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.enums.FeatureType;
import com.kaddy.autoapply.repository.ResumeProfileRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class CareerPathService {

    private static final Logger log = LoggerFactory.getLogger(CareerPathService.class);

    private static final String SYSTEM_PROMPT = """
            You are an expert career coach and talent strategist with deep knowledge of the technology industry.
            Analyze the given professional profile and return a career path analysis as a strict JSON object.
            The JSON must conform exactly to this schema — no additional keys, no markdown, no prose:
            {
              "currentLevel": "<JUNIOR|MID|SENIOR|LEAD|STAFF|PRINCIPAL>",
              "suggestedRoles": ["<role1>", "<role2>", "<role3>", "<role4>", "<role5>"],
              "careerPaths": {
                "<role title>": {
                  "estimatedYears": <integer>,
                  "description": "<one sentence describing the role>",
                  "mandatorySkills": ["<skill1>", "<skill2>", "<skill3>"],
                  "checkpoints": [
                    {
                      "milestone": "<short milestone title>",
                      "description": "<what to achieve at this checkpoint>",
                      "skills": ["<skill>"],
                      "timelineMonths": <integer>
                    }
                  ]
                }
              }
            }
            Provide 3 to 5 suggested roles. For each role include 3 to 5 checkpoints ordered by timeline.
            Base all analysis on actual market demand and realistic progression timelines.
            Return only the raw JSON object — no markdown fences, no explanatory text.""";

    private final UserRepository userRepository;
    private final ResumeProfileRepository resumeProfileRepository;
    private final FeatureConfig featureConfig;
    private final AiProviderFactory aiProviderFactory;
    private final FeatureUsageService featureUsageService;
    private final ObjectMapper objectMapper;

    public CareerPathService(UserRepository userRepository,
                              ResumeProfileRepository resumeProfileRepository,
                              FeatureConfig featureConfig,
                              AiProviderFactory aiProviderFactory,
                              FeatureUsageService featureUsageService,
                              ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.resumeProfileRepository = resumeProfileRepository;
        this.featureConfig = featureConfig;
        this.aiProviderFactory = aiProviderFactory;
        this.featureUsageService = featureUsageService;
        this.objectMapper = objectMapper;
    }

    public CareerPathResponse analyze(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!SecurityUtils.isAdmin()
                && !featureConfig.canAccessCareerPath(user.getSubscriptionTier())) {
            throw new BadRequestException(
                    "Career path analysis requires a Gold or Platinum subscription. Please upgrade.");
        }

        String profileContext = buildProfileContext(user);
        AiProviderFactory.GenerationResult result =
                aiProviderFactory.generate(SYSTEM_PROMPT, profileContext, AiProviderFactory.TaskType.REASONING);

        CareerPathResponse response = parseResponse(result.content());
        featureUsageService.record(userId, FeatureType.CAREER_PATH_ANALYZED, userId);
        return response;
    }

    private String buildProfileContext(User user) {
        StringBuilder sb = new StringBuilder();
        sb.append("PROFESSIONAL PROFILE:\n");
        Optional.ofNullable(user.getName()).ifPresent(v -> sb.append("Name: ").append(v).append("\n"));
        Optional.ofNullable(user.getTitle()).ifPresent(v -> sb.append("Current Title: ").append(v).append("\n"));
        if (user.getExperienceYears() > 0) sb.append("Years of Experience: ").append(user.getExperienceYears()).append("\n");
        Optional.ofNullable(user.getSummary()).ifPresent(v -> sb.append("Summary: ").append(v).append("\n"));
        Optional.ofNullable(user.getTargetRoles()).filter(r -> !r.isEmpty())
                .ifPresent(v -> sb.append("Target Roles: ").append(String.join(", ", v)).append("\n"));
        Optional.ofNullable(user.getSkills()).ifPresent(v -> sb.append("Skills: ").append(v).append("\n"));

        resumeProfileRepository.findByUserId(userId(user)).ifPresent(profile -> {
            appendResumeProfile(sb, profile);
        });

        return sb.toString();
    }

    private String userId(User user) {
        return user.getId();
    }

    private void appendResumeProfile(StringBuilder sb, ResumeProfile profile) {
        Optional.ofNullable(profile.getExperienceLevel())
                .ifPresent(v -> sb.append("Experience Level: ").append(v).append("\n"));
        Optional.ofNullable(profile.getYearsOfExperience())
                .ifPresent(v -> sb.append("Years (from resume): ").append(v).append("\n"));
        Optional.ofNullable(profile.getHeadline())
                .ifPresent(v -> sb.append("Headline: ").append(v).append("\n"));
        Optional.ofNullable(profile.getSkills()).filter(s -> !s.isEmpty())
                .ifPresent(v -> sb.append("Categorised Skills: ").append(v).append("\n"));

        if (profile.getExperience() != null && !profile.getExperience().isEmpty()) {
            sb.append("Work Experience:\n");
            profile.getExperience().forEach(exp ->
                    sb.append("  - ").append(exp.title()).append(" at ").append(exp.company())
                      .append(" (").append(exp.startDate()).append(" to ")
                      .append(exp.current() ? "Present" : exp.endDate()).append(")\n"));
        }

        if (profile.getEducation() != null && !profile.getEducation().isEmpty()) {
            sb.append("Education:\n");
            profile.getEducation().forEach(edu ->
                    sb.append("  - ").append(edu.degree()).append(" in ").append(edu.field())
                      .append(" from ").append(edu.institution()).append("\n"));
        }

        if (profile.getProjects() != null && !profile.getProjects().isEmpty()) {
            sb.append("Projects:\n");
            profile.getProjects().forEach(proj ->
                    sb.append("  - ").append(proj.name()).append(": ").append(proj.description())
                      .append(" [").append(String.join(", ", proj.technologies())).append("]\n"));
        }

        if (profile.getCertifications() != null && !profile.getCertifications().isEmpty()) {
            sb.append("Certifications:\n");
            profile.getCertifications().forEach(cert ->
                    sb.append("  - ").append(cert.name()).append(" by ").append(cert.issuer()).append("\n"));
        }
    }

    private CareerPathResponse parseResponse(String raw) {
        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("```$", "").trim();
        }
        try {
            Map<String, Object> map = objectMapper.readValue(json, new TypeReference<>() {});
            String currentLevel = (String) map.getOrDefault("currentLevel", "MID");

            @SuppressWarnings("unchecked")
            List<String> suggestedRoles = (List<String>) map.getOrDefault("suggestedRoles", List.of());

            @SuppressWarnings("unchecked")
            Map<String, Object> rawPaths = (Map<String, Object>) map.getOrDefault("careerPaths", Map.of());

            Map<String, CareerPathResponse.RolePath> careerPaths = new java.util.LinkedHashMap<>();
            rawPaths.forEach((role, pathObj) -> {
                try {
                    String pathJson = objectMapper.writeValueAsString(pathObj);
                    CareerPathResponse.RolePath rolePath =
                            objectMapper.readValue(pathJson, CareerPathResponse.RolePath.class);
                    careerPaths.put(role, rolePath);
                } catch (Exception e) {
                    log.warn("Could not parse career path for role {}: {}", role, e.getMessage());
                }
            });

            return new CareerPathResponse(currentLevel, suggestedRoles, careerPaths);
        } catch (Exception e) {
            log.error("Failed to parse AI career path response: {}", e.getMessage());
            throw new AiServiceException("Career path analysis returned an unparseable response. Please retry.");
        }
    }
}
