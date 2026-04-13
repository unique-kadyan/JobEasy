package com.kaddy.autoapply.config;

import com.kaddy.autoapply.model.enums.SubscriptionTier;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class FeatureConfig {

    public record Capabilities(
            int maxJobResults,
            boolean autoApply,
            boolean scheduledSearch,
            boolean smartResume,
            boolean priorityScoring,
            boolean coverLetterAi,
            int maxCoverLettersPerDay,
            int maxResumesUploaded,
            boolean careerPath,
            boolean mockInterview,
            int rateLimitPerMinute
    ) {}

    private static final Map<SubscriptionTier, Capabilities> TIER_CAPS = Map.of(
            SubscriptionTier.FREE,
            new Capabilities(15, false, false, false, false, true, 3, 2, false, false, 10),

            SubscriptionTier.GOLD,
            new Capabilities(30, false, false, true, true, true, 25, 10, true, true, 30),

            SubscriptionTier.PLATINUM,
            new Capabilities(Integer.MAX_VALUE, true, true, true, true, true, Integer.MAX_VALUE, Integer.MAX_VALUE, true, true, 60)
    );

    public Capabilities of(SubscriptionTier tier) {
        return TIER_CAPS.getOrDefault(
                tier != null ? tier : SubscriptionTier.FREE,
                TIER_CAPS.get(SubscriptionTier.FREE)
        );
    }

    public int maxJobResults(SubscriptionTier tier)           { return of(tier).maxJobResults(); }
    public boolean canAutoApply(SubscriptionTier tier)        { return of(tier).autoApply(); }
    public boolean canSchedule(SubscriptionTier tier)         { return of(tier).scheduledSearch(); }
    public boolean canSummarize(SubscriptionTier tier)        { return of(tier).coverLetterAi(); }
    public int maxCoverLettersPerDay(SubscriptionTier tier)   { return of(tier).maxCoverLettersPerDay(); }
    public int maxResumesUploaded(SubscriptionTier tier)      { return of(tier).maxResumesUploaded(); }
    public boolean canAccessCareerPath(SubscriptionTier tier)   { return of(tier).careerPath(); }
    public boolean canAccessMockInterview(SubscriptionTier tier){ return of(tier).mockInterview(); }
    public int rateLimitPerMinute(SubscriptionTier tier)        { return of(tier).rateLimitPerMinute(); }
}
