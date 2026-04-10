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

@Service
public class StaleJobPrunerService {

    private static final Logger log = LoggerFactory.getLogger(StaleJobPrunerService.class);

    static final int STALE_AFTER_DAYS = 30;

    static final int BATCH_SIZE = 200;

    static final int MAX_CONCURRENT_CHECKS = 20;

    static final long BATCH_TIMEOUT_MINUTES = 10;

    private static final List<Integer> GONE_STATUSES = List.of(404, 410);

    private final JobRepository jobRepository;
    private final WebClient webClient;
    private final Executor executor;

    public StaleJobPrunerService(JobRepository jobRepository,
                                 WebClient.Builder webClientBuilder,
                                 @Qualifier("virtualThreadExecutor") Executor executor) {
        this.jobRepository = jobRepository;
        this.executor = executor;

        this.webClient = webClientBuilder
                .codecs(c -> c.defaultCodecs().maxInMemorySize(64 * 1024))
                .build();
    }

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

                        boolean jobGone = isGone(job.getUrl());
                        int n = checked.incrementAndGet();
                        if (n % 50 == 0) {
                            log.debug("Pruner progress: {}/{} checked", n, candidates.size());
                        }
                        return jobGone ? job.getId() : null;
                    } finally {

                        semaphore.release();
                    }
                }, executor))
                .toList();

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

            String id = f.getNow(null);
            if (id != null) {
                idsToDelete.add(id);
                gone.incrementAndGet();
            }
        }

        log.info("Pruner URL check complete: {} checked, {} gone", checked.get(), gone.get());
        return idsToDelete;
    }

    private boolean isGone(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            webClient.head()
                    .uri(url)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            return false;
        } catch (WebClientResponseException e) {
            int status = e.getStatusCode().value();
            if (GONE_STATUSES.contains(status)) {
                log.debug("URL gone [{}]: {}", status, url);
                return true;
            }
            return false;
        } catch (Exception e) {

            log.debug("URL check error for {}: {}", url, e.getMessage());
            return false;
        }
    }
}
