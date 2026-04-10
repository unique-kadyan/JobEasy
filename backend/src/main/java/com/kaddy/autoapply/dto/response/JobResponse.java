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
        Double matchScore,
        String matchStrength,
        List<String> missingSkills,
        List<String> aiReasoning,
        Double normalizedSalaryUsd,
        String aiSummary
) {

    public static JobResponse unscored(String id, String externalId, String source,
                                       String title, String company, String location,
                                       String url, String description, String salary,
                                       List<String> tags, String jobType,
                                       LocalDateTime datePosted) {
        return new JobResponse(id, externalId, source, title, company, location,
                url, description, salary, tags, jobType, datePosted,
                null, null, null, null, null, null);
    }

    public JobResponse withScore(double score, String strength,
                                  List<String> missing, List<String> reasoning,
                                  Double salaryUsd) {
        return new JobResponse(id, externalId, source, title, company, location,
                url, description, salary, tags, jobType, datePosted,
                score, strength, missing, reasoning, salaryUsd, aiSummary);
    }

    public JobResponse withSummary(String summary) {
        return new JobResponse(id, externalId, source, title, company, location,
                url, description, salary, tags, jobType, datePosted,
                matchScore, matchStrength, missingSkills, aiReasoning, normalizedSalaryUsd, summary);
    }
}
