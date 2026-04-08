package com.kaddy.autoapply.dto.response;

import java.util.Map;

public record AnalyticsResponse(
        long totalApplications,
        long applied,
        long interviewing,
        long offered,
        long rejected,
        double responseRate,
        Map<String, Long> byStatus
) {}
