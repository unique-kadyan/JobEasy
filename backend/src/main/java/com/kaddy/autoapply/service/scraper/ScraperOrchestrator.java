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

@Service
public class ScraperOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(ScraperOrchestrator.class);

    private static final long SCRAPER_TIMEOUT_SECONDS = 15;

    private static final long FANOUT_TIMEOUT_SECONDS = 25;

    private final List<JobScraper> scrapers;
    private final Executor executor;

    public ScraperOrchestrator(List<JobScraper> scrapers,
                               @Qualifier("virtualThreadExecutor") Executor executor) {
        this.scrapers = scrapers;
        this.executor = executor;
    }

    @Cacheable(
            value = "jobs",
            key = "(#query == null ? '' : #query) + ':' + (#location == null ? '' : #location) + ':' + #page",
            unless = "#result.isEmpty()"
    )
    public List<JobResponse> searchJobs(String query, String location, int page) {
        log.debug("ScraperOrchestrator.searchJobs query='{}' location='{}' page={}", query, location, page);

        List<CompletableFuture<List<JobResponse>>> futures = scrapers.stream()
                .map(scraper -> CompletableFuture
                        .supplyAsync(() -> {
                            try {
                                List<JobResponse> results = scraper.fetchJobs(query, location, page);
                                log.info("Scraper {} returned {} jobs", scraper.getSource(),
                                        results == null ? 0 : results.size());
                                return results == null ? List.<JobResponse>of() : results;
                            } catch (Exception e) {
                                log.error("Scraper {} failed: {}", scraper.getSource(), e.getMessage());
                                return List.<JobResponse>of();
                            }
                        }, executor)
                        .orTimeout(SCRAPER_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                        .exceptionally(ex -> {
                            log.warn("Scraper {} timed out or errored: {}",
                                    scraper.getSource(), ex.getMessage());
                            return List.of();
                        }))
                .toList();

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(FANOUT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("ScraperOrchestrator: fanout ceiling reached — cancelling slow scrapers and returning partial results");
            futures.forEach(f -> f.cancel(true));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            futures.forEach(f -> f.cancel(true));
            log.warn("ScraperOrchestrator: interrupted while waiting for scrapers");
        } catch (ExecutionException e) {
            log.error("ScraperOrchestrator: unexpected execution error", e.getCause());
        }

        List<JobResponse> allJobs = futures.stream()
                .map(f -> f.getNow(List.of()))
                .flatMap(List::stream)
                .collect(Collectors.toList());

        Set<String> seenUrls = new HashSet<>();
        List<JobResponse> deduplicated = allJobs.stream()
                .filter(job -> job.url() != null && !job.url().isBlank() && seenUrls.add(job.url()))
                .collect(Collectors.toList());

        log.info("ScraperOrchestrator: {} total jobs, {} after dedup for query='{}'",
                allJobs.size(), deduplicated.size(), query);

        return deduplicated;
    }
}
