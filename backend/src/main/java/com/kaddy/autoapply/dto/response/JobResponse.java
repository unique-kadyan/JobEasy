package com.kaddy.autoapply.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record JobResponse(
        String id,
        String externalId,
        String source,
        String title,
        String company,
        String location,
        String url,
        String description,
        String salary,
        List<String> tags,
        String jobType,
        LocalDateTime datePosted,
        Double matchScore,          // local keyword score  (0–1)
        String matchStrength,       // STRONG / MODERATE / WEAK / UNRATED
        List<String> missingSkills, // skills in profile not found in description
        List<String> aiReasoning,   // bullet points from AI deep evaluation
        Double normalizedSalaryUsd  // annual USD equivalent for comparison
) {

    /** Convenience factory: unscored job (all scoring fields null). */
    public static JobResponse unscored(String id, String externalId, String source,
                                       String title, String company, String location,
                                       String url, String description, String salary,
                                       List<String> tags, String jobType,
                                       LocalDateTime datePosted) {
        return new JobResponse(id, externalId, source, title, company, location,
                url, description, salary, tags, jobType, datePosted,
                null, null, null, null, null);
    }

    /** Returns a copy of this job with score fields populated. */
    public JobResponse withScore(double score, String strength,
                                  List<String> missing, List<String> reasoning,
                                  Double salaryUsd) {
        return new JobResponse(id, externalId, source, title, company, location,
                url, description, salary, tags, jobType, datePosted,
                score, strength, missing, reasoning, salaryUsd);
    }
}
