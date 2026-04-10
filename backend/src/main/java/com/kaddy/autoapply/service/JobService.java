package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.dto.response.PagedResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.enums.JobSource;
import com.kaddy.autoapply.model.enums.SubscriptionTier;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.repository.JobRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.scraper.ScraperOrchestrator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

/**
 * Job search, retrieval, and DB caching service.
 *
 * <h3>Parallel I/O in {@link #searchJobs}</h3>
 * <p>Each search request fans out two independent operations concurrently:
 * <ol>
 *   <li>External scraper call ({@link ScraperOrchestrator#searchJobs}) — network I/O to JSearch API.</li>
 *   <li>MongoDB text-search query — network I/O to Atlas.</li>
 * </ol>
 * <p>These have no data dependency on each other. Running them on virtual threads halves
 * the blocking time before the result can be assembled. A 15-second {@link TimeUnit#SECONDS}
 * ceiling prevents the handler thread from waiting indefinitely on a slow scraper or DB node.
 *
 * <h3>Fire-and-forget cache writes</h3>
 * <p>Scraped jobs are persisted to MongoDB asynchronously on a virtual thread so the
 * HTTP response is not delayed by the upsert loop. Any individual failure is logged at
 * DEBUG and does not propagate.
 *
 * <h3>Redis caching</h3>
 * <p>{@link #getJobEntity(String)} is backed by a Redis "jobs" cache (60-min TTL, configured
 * in {@code RedisConfig}).  This avoids repeated Atlas round-trips from
 * {@code CoverLetterService}, {@code ApplicationService}, and the scoring pipeline.
 */
@Service
public class JobService {

    private static final Logger log = LoggerFactory.getLogger(JobService.class);

    /** Total wall-clock ceiling for the concurrent scrape + DB query phase. */
    private static final long SEARCH_TIMEOUT_SECONDS = 15;

    private final JobRepository       jobRepository;
    private final ScraperOrchestrator scraperOrchestrator;
    private final JobScoringService   jobScoringService;
    private final UserRepository      userRepository;
    private final Executor            executor;

    public JobService(JobRepository jobRepository,
                      ScraperOrchestrator scraperOrchestrator,
                      JobScoringService jobScoringService,
                      UserRepository userRepository,
                      @Qualifier("virtualThreadExecutor") Executor executor) {
        this.jobRepository       = jobRepository;
        this.scraperOrchestrator = scraperOrchestrator;
        this.jobScoringService   = jobScoringService;
        this.userRepository      = userRepository;
        this.executor            = executor;
    }

    public PagedResponse<JobResponse> searchJobs(String query, String location,
                                                 String source, int page, int size) {
        return searchJobs(query, location, source, page, size, null);
    }

    /**
     * Searches jobs and optionally scores/filters them against the authenticated user's profile.
     *
     * <p>The scraper fan-out and the MongoDB text-search are fired concurrently on virtual
     * threads. Both complete (or timeout) before the result is assembled — no thread parks
     * for longer than {@value #SEARCH_TIMEOUT_SECONDS} seconds.
     *
     * @param userId optional — when non-null, skip-keyword filtering and local scoring are applied
     */
    public PagedResponse<JobResponse> searchJobs(String query, String location,
                                                 String source, int page, int size,
                                                 String userId) {
        // ── Concurrent I/O: scraper + DB search fired in parallel ─────────────
        CompletableFuture<List<JobResponse>> scrapeFuture = CompletableFuture.supplyAsync(
                () -> scraperOrchestrator.searchJobs(query, location, page), executor);

        CompletableFuture<Page<Job>> dbFuture = CompletableFuture.supplyAsync(
                () -> (source != null && !source.isBlank())
                        ? jobRepository.searchJobsBySource(query, source, PageRequest.of(page, size))
                        : jobRepository.searchJobs(query, PageRequest.of(page, size)),
                executor);

        List<JobResponse> scraped;
        Page<Job>         dbPage;
        try {
            CompletableFuture.allOf(scrapeFuture, dbFuture)
                    .get(SEARCH_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("Job search timed out after {} s — using partial results", SEARCH_TIMEOUT_SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException e) {
            log.warn("Job search error: {}", e.getCause().getMessage());
        }

        scraped = scrapeFuture.getNow(List.of());
        dbPage  = dbFuture.getNow(null);

        // ── Fire-and-forget: persist scraped jobs to DB ────────────────────────
        if (!scraped.isEmpty()) {
            final List<JobResponse> toCache = scraped;
            CompletableFuture.runAsync(() -> cacheJobs(toCache), executor);
        }

        // ── Assemble result ────────────────────────────────────────────────────
        List<JobResponse> candidates;
        long totalElements;
        int  totalPages;

        if (dbPage != null && dbPage.hasContent()) {
            candidates    = dbPage.getContent().stream().map(this::toJobResponse).toList();
            totalElements = dbPage.getTotalElements();
            totalPages    = dbPage.getTotalPages();
        } else {
            // Fall back to scraped results with manual pagination
            int total = scraped.size();
            int from  = page * size;
            int to    = Math.min(from + size, total);
            candidates    = from < total ? scraped.subList(from, to) : List.of();
            totalElements = total;
            totalPages    = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        }

        // ── Score and filter when a user context is available ─────────────────
        User user = null;
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                candidates = jobScoringService.scoreAndFilterBatch(user, candidates);
            }
        }

        // ── Subscription gate: FREE tier sees only 2 results ──────────────────
        if (!SecurityUtils.isAdmin()) {
            SubscriptionTier tier = (user != null) ? user.getSubscriptionTier() : SubscriptionTier.FREE;
            if (tier == SubscriptionTier.FREE && candidates.size() > 2) {
                candidates = candidates.subList(0, 2);
                totalElements = 2;
                totalPages = 1;
            }
        }

        return new PagedResponse<>(candidates, totalElements, totalPages, page, size);
    }

    /** Returns per-source job counts for the given query — used to populate tab badges. */
    public Map<String, Long> getSourceCounts(String query, String location) {
        List<JobResponse> scraped = scraperOrchestrator.searchJobs(query, location, 0);
        return scraped.stream()
                .filter(j -> j.source() != null)
                .collect(Collectors.groupingBy(JobResponse::source, Collectors.counting()));
    }

    public JobResponse getJob(String id) {
        return toJobResponse(getJobEntity(id));
    }

    /**
     * Fetches a {@link Job} by id.
     *
     * <p>Results are cached in Redis under the {@code "jobs"} cache (60-min TTL).
     * Cover letter generation, application create, and the scoring pipeline all
     * call this method — the cache eliminates redundant Atlas lookups across those
     * independent request paths.
     */
    @Cacheable(value = "jobs", key = "#id")
    public Job getJobEntity(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Upserts scraped jobs into the DB.  Called fire-and-forget on a virtual thread —
     * failures are isolated per-job and never propagate to the HTTP response.
     */
    private void cacheJobs(List<JobResponse> jobs) {
        for (JobResponse jr : jobs) {
            JobSource source = JobSource.fromStringOrNull(jr.source());
            if (source == null || jr.externalId() == null) continue;
            try {
                if (jobRepository.findBySourceAndExternalId(source, jr.externalId()).isEmpty()) {
                    jobRepository.save(Job.builder()
                            .externalId(jr.externalId()).source(source)
                            .title(jr.title()).company(jr.company()).location(jr.location())
                            .url(jr.url()).description(jr.description()).salary(jr.salary())
                            .tags(jr.tags()).jobType(jr.jobType()).datePosted(jr.datePosted())
                            .scrapedAt(LocalDateTime.now())
                            .build());
                }
            } catch (Exception e) {
                log.debug("Failed to cache job {}: {}", jr.externalId(), e.getMessage());
            }
        }
    }

    private JobResponse toJobResponse(Job job) {
        return JobResponse.unscored(
                job.getId(), job.getExternalId(), job.getSource().name(),
                job.getTitle(), job.getCompany(), job.getLocation(),
                job.getUrl(), job.getDescription(), job.getSalary(),
                job.getTags(), job.getJobType(), job.getDatePosted()
        );
    }
}
