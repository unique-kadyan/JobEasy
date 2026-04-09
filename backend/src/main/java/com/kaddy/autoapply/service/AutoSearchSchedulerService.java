package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.model.SearchRun;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.SearchRunRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.scraper.ScraperOrchestrator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

/**
 * Runs automatic job searches for users who have opted in to the feature.
 *
 * <p>Schedule: every hour (configurable). Each invocation pages through opted-in
 * users, checks who is due for a search, and fires an async search per user.
 *
 * <h3>Memory safety</h3>
 * <p>Users are loaded in pages of {@link #USER_PAGE_SIZE} rather than via
 * {@code findAll()}, which would load the entire user collection into heap at once.
 * At millions of users this would cause an OOM. Pagination keeps resident memory
 * bounded to one page at a time.
 *
 * <h3>Timeout discipline</h3>
 * <p>Each per-user search future is bounded by {@link #PER_USER_TIMEOUT_MINUTES}.
 * A runaway search (e.g., all scrapers timing out and retrying) cannot hold a
 * virtual thread indefinitely — it is cancelled after the deadline and the user
 * is skipped until the next scheduler tick.
 */
@Service
public class AutoSearchSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(AutoSearchSchedulerService.class);

    /** Number of opted-in users loaded per DB page — keeps heap usage bounded. */
    private static final int USER_PAGE_SIZE = 100;

    /** Per-user search ceiling — prevents a hung scraper from blocking a virtual thread forever. */
    private static final long PER_USER_TIMEOUT_MINUTES = 2;

    @Value("${auto.search.check.interval.ms:3600000}")
    private long checkIntervalMs;

    private final UserRepository        userRepository;
    private final SearchRunRepository   searchRunRepository;
    private final ScraperOrchestrator   scraperOrchestrator;
    private final JobScoringService     jobScoringService;
    private final Executor              executor;

    public AutoSearchSchedulerService(UserRepository userRepository,
                                      SearchRunRepository searchRunRepository,
                                      ScraperOrchestrator scraperOrchestrator,
                                      JobScoringService jobScoringService,
                                      @Qualifier("virtualThreadExecutor") Executor executor) {
        this.userRepository      = userRepository;
        this.searchRunRepository = searchRunRepository;
        this.scraperOrchestrator = scraperOrchestrator;
        this.jobScoringService   = jobScoringService;
        this.executor            = executor;
    }

    // ── Scheduled entry point ─────────────────────────────────────────────────

    /**
     * Pages through opted-in users and fires an async, time-bounded search per user.
     * The scheduler thread itself returns immediately after submitting all futures.
     */
    @Scheduled(fixedDelayString = "${auto.search.check.interval.ms:3600000}")
    public void runScheduledSearches() {
        int pageNum = 0;
        int totalDispatched = 0;

        while (true) {
            Page<User> page = userRepository.findByAutoSearchEnabledTrue(
                    PageRequest.of(pageNum, USER_PAGE_SIZE));

            List<User> dueUsers = page.getContent().stream()
                    .filter(this::isDue)
                    .toList();

            for (User user : dueUsers) {
                CompletableFuture
                        .runAsync(() -> runSearchForUser(user), executor)
                        // Hard per-user ceiling — cancel and log if exceeded
                        .orTimeout(PER_USER_TIMEOUT_MINUTES, TimeUnit.MINUTES)
                        .exceptionally(t -> {
                            log.error("Auto-search failed/timed-out for user {}: {}",
                                    user.getId(), t.getMessage());
                            return null;
                        });
            }

            totalDispatched += dueUsers.size();

            if (page.isLast()) break;
            pageNum++;
        }

        if (totalDispatched > 0) {
            log.info("Auto-search scheduler: dispatched {} user search(es)", totalDispatched);
        }
    }

    // ── Per-user search ───────────────────────────────────────────────────────

    private void runSearchForUser(User user) {
        String query    = extractParam(user, "query", "");
        String location = extractParam(user, "location", "");

        if (query.isBlank()) {
            if (user.getTargetRoles() != null && !user.getTargetRoles().isEmpty()) {
                query = user.getTargetRoles().get(0);
            } else if (user.getTitle() != null && !user.getTitle().isBlank()) {
                query = user.getTitle();
            } else {
                log.debug("Auto-search skipped for user {}: no query or target role set", user.getId());
                return;
            }
        }

        log.info("Auto-search running for user={}, query='{}', location='{}'",
                user.getId(), query, location);

        try {
            List<JobResponse> raw = scraperOrchestrator.searchJobs(query, location, 0);

            List<JobResponse> scored = jobScoringService.scoreAndFilterBatch(user, raw);

            long matched = scored.stream()
                    .filter(j -> !"WEAK".equals(j.matchStrength()))
                    .count();

            Map<String, Integer> bySource = new HashMap<>();
            for (JobResponse j : scored) {
                bySource.merge(j.source(), 1, Integer::sum);
            }

            searchRunRepository.save(SearchRun.create(
                    user.getId(), List.of(query), raw.size(), (int) matched, bySource));

            // Stamp last-run — this user won't be re-selected until the next interval
            user.setAutoSearchLastRun(LocalDateTime.now());
            userRepository.save(user);

            log.info("Auto-search complete for user={}: {} found, {} matched",
                    user.getId(), raw.size(), matched);

        } catch (Exception e) {
            log.error("Auto-search error for user={}: {}", user.getId(), e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean isDue(User user) {
        if (user.getAutoSearchLastRun() == null) return true;
        LocalDateTime nextDue = user.getAutoSearchLastRun()
                .plusHours(user.getAutoSearchIntervalHours());
        return LocalDateTime.now().isAfter(nextDue);
    }

    private String extractParam(User user, String key, String defaultVal) {
        Map<String, Object> params = user.getAutoSearchParams();
        if (params == null) return defaultVal;
        Object val = params.get(key);
        return val instanceof String s ? s : defaultVal;
    }
}
