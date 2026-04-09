package com.kaddy.autoapply.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.Map;

public record AutoSearchScheduleRequest(
        @NotNull(message = "enabled flag is required")
        Boolean enabled,

        /**
         * Polling interval in hours. Allowed values: 1, 2, 4, 6, 12, 24.
         */
        @Pattern(regexp = "^(1|2|4|6|12|24)$",
                 message = "intervalHours must be one of: 1, 2, 4, 6, 12, 24")
        String intervalHours,

        /**
         * Arbitrary search parameters (query, location, etc.).
         * Keys are free-form; the scheduler extracts "query" and "location" by convention.
         */
        Map<String, Object> searchParams
) {}
