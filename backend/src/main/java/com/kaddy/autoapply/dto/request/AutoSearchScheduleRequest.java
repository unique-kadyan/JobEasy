package com.kaddy.autoapply.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.Map;

public record AutoSearchScheduleRequest(
        @NotNull(message = "enabled flag is required")
        Boolean enabled,

        @Pattern(regexp = "^(1|2|4|6|12|24)$",
                 message = "intervalHours must be one of: 1, 2, 4, 6, 12, 24")
        String intervalHours,

        Map<String, Object> searchParams
) {}
