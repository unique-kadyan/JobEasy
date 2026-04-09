package com.kaddy.autoapply.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

public record AutoSearchScheduleResponse(
        boolean enabled,
        int intervalHours,
        Map<String, Object> searchParams,
        LocalDateTime lastRun,
        LocalDateTime nextRun
) {}
