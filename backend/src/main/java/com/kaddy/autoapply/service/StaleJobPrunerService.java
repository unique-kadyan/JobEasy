package com.kaddy.autoapply.service;

import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Periodically prunes job listings whose original URLs are no longer reachable.
 *
 * <p>Schedule: every Sunday at 02:00 (configurable via {@code job.pruner.cron}).
 *
 * <p>Strategy:
 * <ol>
 *   <li>Load jobs older than {@link #STALE_AFTER_DAYS} days in batches of
 *       {@link #BATCH_SIZE}.</li>
 *   <li>Issue an HTTP HEAD request for each URL (no body downloaded).</li>
 *   <li>Delete jobs that return 404 or 410 (definitively gone).</li>
 *   <li>Jobs returning 5xx or connection errors are left in place — the
 *       server may be temporarily down.</li>
 * </ol>
 *
 * <h3>Concurrency model</h3>
 * <p>Each URL check runs on its own virtual thread via {@code virtualThreadExecutor}.
 * A {@link Semaphore} bounds concurrent in-flight HTTP requests to
 * {@link #MAX_CONCURRENT_CHECKS} to avoid hammering job boards.
 * The semaphore is released in a {@code finally} block — it is impossible to leak
 * a permit even if {@code isGone()} throws.
 *
 * <h3>Timeout safety</h3>
 * <ul>
 *   <li>Per-URL: WebClient's {@code responseTimeout} (configured globally in
 *       {@code WebClientConfig}) ensures no single HEAD request hangs indefinitely.</li>
 *   <li>Per-batch: {@link #BATCH_TIMEOUT_MINUTES} caps the entire pruner run so a
 *       pathologically slow batch cannot block the scheduler indefinitely.</li>
 * </ul>
 */
@Service
public class StaleJobPrunerService {

    private static final Logger log = LoggerFactory.getLogger(StaleJobPrunerService.class);

    /** Jobs older than this many days are candidates for link-checking. */
    static final int STALE_AFTER_DAYS = 30;

    /** Number of jobs loaded and checked per scheduler invocation batch. */
    static final int BATCH_SIZE = 200;

    /** Maximum parallel HEAD requests per batch to avoid overwhelming job boards. */
    static final int MAX_CONCURRENT_CHECKS = 20;

    /**
     * Hard ceiling on the total time allowed for one pruner run.
     * Prevents the scheduler from being held indefinitely by a slow batch.
     */
    static final long BATCH_TIMEOUT_MINUTES = 10;

    /** HTTP status codes that definitively indicate a job is gone. */
    private static final List<Integer> GONE_STATUSES = List.of(404, 410);

    private final JobRepository jobRepository;
    private final WebClient webClient;
    private final Executor executor;

    public StaleJobPrunerService(JobRepository jobRepository,
                                 WebClient.Builder webClientBuilder,
                                 @Qualifier("virtualThreadExecutor") Executor executor) {
        this.jobRepository = jobRepository;
        this.executor = executor;
        // 64 KB cap — HEAD responses have no body; prevents accidental large-body buffering
        this.webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(64 * 1024))
                .build();
    }

    // ── Scheduled entry point ─────────────────────────────────────────────────

    @Scheduled(cron = "${job.pruner.cron:0 0 2 * * SUN}")
    public void pruneStaleJobs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(STALE_AFTER_DAYS);
        log.info("Stale job pruner starting — checking jobs scraped before {}", cutoff);

        List<Job> candidates = jobRepository.findStaleJobs(
                cutoff, PageRequest.of(0, BATCH_SIZE));

        if (candidates.isEmpty()) {
            log.info("Stale job pruner: no candidates found, nothing to do");
            return;
        }

        log.info("Stale job pruner: checking {} candidate URLs", candidates.size());

        List<String> idsToDelete = checkUrls(candidates);

        if (!idsToDelete.isEmpty()) {
            jobRepository.deleteAllById(idsToDelete);
            log.info("Stale job pruner: deleted {} gone jobs", idsToDelete.size());
        } else {
            log.info("Stale job pruner: all {} URLs still reachable", candidates.size());
        }
    }

    // ── URL checking ──────────────────────────────────────────────────────────

    /**
     * Issues concurrent HEAD requests and returns IDs of definitively-gone jobs.
     *
     * <p><b>Semaphore discipline:</b> {@code acquire()} is immediately followed by a
     * {@code try/finally} that calls {@code release()}, guaranteeing no permit leak
     * even if {@code isGone()} throws an unchecked exception.
     *
     * <p><b>Timeout discipline:</b> individual futures carry a per-URL timeout via
     * WebClient's {@code responseTimeout}. The outer {@code allOf.get(timeout)} adds
     * a hard batch ceiling so the scheduler cannot be held for more than
     * {@link #BATCH_TIMEOUT_MINUTES} minutes regardless of network conditions.
     */
    private List<String> checkUrls(List<Job> candidates) {
        Semaphore semaphore = new Semaphore(MAX_CONCURRENT_CHECKS);
        AtomicInteger checked = new AtomicInteger(0);
        AtomicInteger gone    = new AtomicInteger(0);

        List<CompletableFuture<String>> futures = candidates.stream()
                .map(job -> CompletableFuture.supplyAsync(() -> {
                    try {
                        semaphore.acquire();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return null;
                    }
                    try {
                        // isGone() is protected by WebClient's responseTimeout —
                        // no hung virtual thread is possible here.
                        boolean jobGone = isGone(job.getUrl());
                        int n = checked.incrementAndGet();
                        if (n % 50 == 0) {
                            log.debug("Pruner progress: {}/{} checked", n, candidates.size());
                        }
                        return jobGone ? job.getId() : null;
                    } finally {
                        // Always release: guarantees no permit leak on any code path.
                        semaphore.release();
                    }
                }, executor))
                .toList();

        // Hard batch ceiling — partial results are accepted if time runs out.
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(BATCH_TIMEOUT_MINUTES, TimeUnit.MINUTES);
        } catch (TimeoutException e) {
            log.warn("Pruner: batch timeout after {} min — using partial results", BATCH_TIMEOUT_MINUTES);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Pruner: interrupted while waiting for URL checks");
        } catch (ExecutionException e) {
            log.error("Pruner: unexpected execution error", e.getCause());
        }

        List<String> idsToDelete = new ArrayList<>();
        for (CompletableFuture<String> f : futures) {
            // getNow(null) returns immediately — either the completed value or null if still running
            String id = f.getNow(null);
            if (id != null) {
                idsToDelete.add(id);
                gone.incrementAndGet();
            }
        }

        log.info("Pruner URL check complete: {} checked, {} gone", checked.get(), gone.get());
        return idsToDelete;
    }

    /**
     * Returns {@code true} if the URL definitively no longer exists (404 or 410).
     * Returns {@code false} for all other outcomes including timeouts and 5xx errors.
     * WebClient's global {@code responseTimeout} (set in {@code WebClientConfig})
     * ensures this call never blocks indefinitely.
     */
    private boolean isGone(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            webClient.head()
                    .uri(url)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            return false; // 2xx — alive
        } catch (WebClientResponseException e) {
            int status = e.getStatusCode().value();
            if (GONE_STATUSES.contains(status)) {
                log.debug("URL gone [{}]: {}", status, url);
                return true;
            }
            return false; // 3xx (redirects followed), 5xx — keep the job
        } catch (Exception e) {
            // Network timeout, SSL error, etc. — be conservative and keep the job
            log.debug("URL check error for {}: {}", url, e.getMessage());
            return false;
        }
    }
}
