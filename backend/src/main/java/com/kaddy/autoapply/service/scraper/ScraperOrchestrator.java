package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

/**
 * Fans out job searches to all registered scrapers in parallel and merges the results.
 *
 * <h3>Concurrency model</h3>
 * <p>Each scraper runs on its own virtual thread (via {@code virtualThreadExecutor}).
 * Virtual threads are I/O-bound and cheap — blocking on an HTTP response parks the
 * thread without tying up a platform (OS) thread.
 *
 * <h3>Timeout discipline — two layers</h3>
 * <ol>
 *   <li><b>Per-scraper ({@value #SCRAPER_TIMEOUT_SECONDS} s):</b> {@code orTimeout()} is
 *       applied to every individual future. A timed-out future resolves to an empty list
 *       via {@code exceptionally()}, so one slow job board never blocks others.</li>
 *   <li><b>Fanout ceiling ({@value #FANOUT_TIMEOUT_SECONDS} s):</b> {@code allOf().get(timeout)}
 *       caps the entire fan-out. Even if all scrapers are slow, the request returns
 *       partial results within the ceiling rather than hanging indefinitely.</li>
 * </ol>
 */
@Service
public class ScraperOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(ScraperOrchestrator.class);

    /** Per-scraper timeout — one slow board cannot block the entire response. */
    private static final long SCRAPER_TIMEOUT_SECONDS = 10;

    /** Total fanout ceiling — partial results are better than a hung request. */
    private static final long FANOUT_TIMEOUT_SECONDS = 12;

    private final List<JobScraper> scrapers;
    private final Executor executor;

    public ScraperOrchestrator(List<JobScraper> scrapers,
                               @Qualifier("virtualThreadExecutor") Executor executor) {
        this.scrapers = scrapers;
        this.executor = executor;
    }

    @Cacheable(value = "jobs", key = "#query + ':' + #location + ':' + #page")
    public List<JobResponse> searchJobs(String query, String location, int page) {
        // Launch all scrapers concurrently on virtual threads
        List<CompletableFuture<List<JobResponse>>> futures = scrapers.stream()
                .map(scraper -> CompletableFuture
                        .supplyAsync(() -> {
                            try {
                                return scraper.fetchJobs(query, location, page);
                            } catch (Exception e) {
                                log.error("Scraper {} failed: {}", scraper.getSource(), e.getMessage());
                                return List.<JobResponse>of();
                            }
                        }, executor)
                        // Per-scraper timeout: timed-out future resolves to empty list —
                        // it never propagates an exception to the caller.
                        .orTimeout(SCRAPER_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                        .exceptionally(ex -> {
                            log.warn("Scraper {} timed out or errored: {}",
                                    scraper.getSource(), ex.getMessage());
                            return List.of();
                        }))
                .toList();

        // Hard fanout ceiling — accept partial results rather than blocking
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(FANOUT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("ScraperOrchestrator: fanout ceiling reached — returning partial results");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("ScraperOrchestrator: interrupted while waiting for scrapers");
        } catch (ExecutionException e) {
            log.error("ScraperOrchestrator: unexpected execution error", e.getCause());
        }

        // getNow(List.of()) returns the result if done, or empty list if still running.
        // orTimeout + exceptionally guarantee no future is left in a non-terminal state
        // after FANOUT_TIMEOUT_SECONDS, so this collect is always non-blocking.
        List<JobResponse> allJobs = futures.stream()
                .map(f -> f.getNow(List.of()))
                .flatMap(List::stream)
                .collect(Collectors.toList());

        // Deduplicate by URL
        Set<String> seenUrls = new HashSet<>();
        return allJobs.stream()
                .filter(job -> job.url() != null && seenUrls.add(job.url()))
                .collect(Collectors.toList());
    }
}
