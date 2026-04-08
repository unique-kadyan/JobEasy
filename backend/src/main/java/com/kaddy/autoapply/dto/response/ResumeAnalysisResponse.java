package com.kaddy.autoapply.dto.response;

import java.util.List;

public record ResumeAnalysisResponse(
        String id,
        int atsScore,
        String scoreLabel,
        List<String> missingFields,
        List<String> suggestions,
        List<String> strengths,
        String lengthAssessment,
        int wordCount
) {}
