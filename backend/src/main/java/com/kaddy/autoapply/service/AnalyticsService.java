package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.AnalyticsResponse;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import com.kaddy.autoapply.repository.ApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private static final long QUERY_TIMEOUT_SECONDS = 5;

    private final ApplicationRepository applicationRepository;
    private final Executor executor;

    public AnalyticsService(ApplicationRepository applicationRepository,
                            @Qualifier("virtualThreadExecutor") Executor executor) {
        this.applicationRepository = applicationRepository;
        this.executor = executor;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public AnalyticsResponse getSummary(String userId) {

        CompletableFuture<Long> totalF        = supplyCount(() -> applicationRepository.countByUserId(userId));
        CompletableFuture<Long> appliedF      = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.APPLIED));
        CompletableFuture<Long> interviewingF = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.INTERVIEWING));
        CompletableFuture<Long> offeredF      = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.OFFERED));
        CompletableFuture<Long> rejectedF     = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.REJECTED));
        CompletableFuture<Long> withdrawnF    = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.WITHDRAWN));

        try {
            CompletableFuture.allOf(totalF, appliedF, interviewingF, offeredF, rejectedF, withdrawnF)
                    .get(QUERY_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("Analytics queries timed out for user {} — returning partial results", userId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException e) {
            log.error("Analytics query failed for user {}: {}", userId, e.getCause().getMessage());
        }

        long total        = totalF.getNow(0L);
        long applied      = appliedF.getNow(0L);
        long interviewing = interviewingF.getNow(0L);
        long offered      = offeredF.getNow(0L);
        long rejected     = rejectedF.getNow(0L);
        long withdrawn    = withdrawnF.getNow(0L);

        double responseRate = total > 0
                ? (double) (interviewing + offered + rejected) / total * 100
                : 0;

        Map<String, Long> byStatus = new LinkedHashMap<>();
        byStatus.put("APPLIED",      applied);
        byStatus.put("INTERVIEWING", interviewing);
        byStatus.put("OFFERED",      offered);
        byStatus.put("REJECTED",     rejected);
        byStatus.put("WITHDRAWN",    withdrawn);

        return new AnalyticsResponse(
                total, applied, interviewing, offered, rejected,
                Math.round(responseRate * 100.0) / 100.0,
                byStatus);
    }

    private CompletableFuture<Long> supplyCount(java.util.function.Supplier<Long> supplier) {
        return CompletableFuture.supplyAsync(supplier, executor)
                .exceptionally(ex -> {
                    log.warn("Count query failed: {}", ex.getMessage());
                    return 0L;
                });
    }
}
