package com.kaddy.autoapply.dto.response;

import java.util.List;
import java.util.Map;

public record CareerPathResponse(
        String currentLevel,
        List<String> suggestedRoles,
        Map<String, RolePath> careerPaths
) {
    public record RolePath(
            int estimatedYears,
            String description,
            List<String> mandatorySkills,
            List<Checkpoint> checkpoints
    ) {}

    public record Checkpoint(
            String milestone,
            String description,
            List<String> skills,
            int timelineMonths
    ) {}
}
