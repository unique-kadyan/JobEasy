package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.AnalyticsResponse;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import com.kaddy.autoapply.repository.ApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Computes analytics summary for a given user.
 *
 * <h3>Parallel query strategy</h3>
 * <p>The original implementation issued 6 sequential MongoDB {@code count()} calls.
 * Each call involves a network round-trip to Atlas (≈ 5–20 ms each), meaning the
 * total latency was 30–120 ms serial.
 *
 * <p>All 6 counts are independent — there is no data dependency between them — so
 * they are now fired concurrently on virtual threads via {@code virtualThreadExecutor}.
 * The {@link CompletableFuture#allOf} barrier waits for all to complete (or the
 * {@value #QUERY_TIMEOUT_SECONDS}-second ceiling), then assembles the response.
 * Effective latency drops to the single slowest count ≈ 5–20 ms.
 *
 * <h3>Timeout safety</h3>
 * <p>If all queries complete within {@value #QUERY_TIMEOUT_SECONDS} s, results are
 * assembled normally.  If a MongoDB node is slow, partial results default to {@code 0}
 * so the endpoint always returns rather than hanging.
 */
@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    /** Hard ceiling per analytics request — 5 s is generous for count queries. */
    private static final long QUERY_TIMEOUT_SECONDS = 5;

    private final ApplicationRepository applicationRepository;
    private final Executor executor;

    public AnalyticsService(ApplicationRepository applicationRepository,
                            @Qualifier("virtualThreadExecutor") Executor executor) {
        this.applicationRepository = applicationRepository;
        this.executor = executor;
    }

    /**
     * Returns an analytics summary for {@code userId}.
     *
     * <p>All 6 MongoDB count queries execute in parallel. Each runs on its own
     * virtual thread so the carrier pool is never blocked by I/O waiting.
     */
    @PreAuthorize("isAuthenticated()")
    public AnalyticsResponse getSummary(String userId) {
        // ── Launch all 6 counts in parallel ──────────────────────────────────
        CompletableFuture<Long> totalF        = supplyCount(() -> applicationRepository.countByUserId(userId));
        CompletableFuture<Long> appliedF      = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.APPLIED));
        CompletableFuture<Long> interviewingF = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.INTERVIEWING));
        CompletableFuture<Long> offeredF      = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.OFFERED));
        CompletableFuture<Long> rejectedF     = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.REJECTED));
        CompletableFuture<Long> withdrawnF    = supplyCount(() -> applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.WITHDRAWN));

        // ── Wait for all with a hard timeout ─────────────────────────────────
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

        // ── Assemble — getNow(0) returns 0 if the future is still pending ────
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

    /**
     * Wraps a count supplier in a {@link CompletableFuture} on the virtual-thread
     * executor. On exception the future resolves to {@code 0} — a single slow or
     * failing collection never poisons the whole response.
     */
    private CompletableFuture<Long> supplyCount(java.util.function.Supplier<Long> supplier) {
        return CompletableFuture.supplyAsync(supplier, executor)
                .exceptionally(ex -> {
                    log.warn("Count query failed: {}", ex.getMessage());
                    return 0L;
                });
    }
}
