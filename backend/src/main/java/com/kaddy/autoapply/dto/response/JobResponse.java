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
        Double matchScore
) {}
