package com.kaddy.autoapply.service;

import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Component("staleJobPruner")
public class StaleJobPrunerHealthIndicator implements HealthIndicator {

    private static final long MAX_HOURS_SINCE_RUN = 14 * 24;

    private final StaleJobPrunerService prunerService;

    public StaleJobPrunerHealthIndicator(StaleJobPrunerService prunerService) {
        this.prunerService = prunerService;
    }

    @Override
    public Health health() {
        LocalDateTime lastRun = prunerService.getLastRunAt();

        if (lastRun == null) {
            return Health.unknown()
                    .withDetail("status", "Pruner has not run yet since startup")
                    .build();
        }

        long hoursSince = ChronoUnit.HOURS.between(lastRun, LocalDateTime.now());
        if (hoursSince > MAX_HOURS_SINCE_RUN) {
            return Health.down()
                    .withDetail("lastRunAt", lastRun.toString())
                    .withDetail("hoursSinceLastRun", hoursSince)
                    .withDetail("threshold", MAX_HOURS_SINCE_RUN + "h")
                    .build();
        }

        return Health.up()
                .withDetail("lastRunAt", lastRun.toString())
                .withDetail("hoursSinceLastRun", hoursSince)
                .withDetail("deletedOnLastRun", prunerService.getLastRunDeletedCount())
                .build();
    }
}
