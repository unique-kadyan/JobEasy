package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.FeatureConfig;
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
import com.kaddy.autoapply.service.ai.AiProviderFactory;
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

@Service
public class JobService {

    private static final Logger log = LoggerFactory.getLogger(JobService.class);

    private static final long SEARCH_TIMEOUT_SECONDS = 30;

    private static final String SUMMARIZE_SYSTEM = """
            You are a concise technical recruiter. Summarize this job posting in 3-4 bullet points \
            covering: role, key requirements, tech stack, and work arrangement. \
            Be direct. No filler. Use plain text, no markdown.""";

    private final JobRepository                 jobRepository;
    private final ScraperOrchestrator           scraperOrchestrator;
    private final JobScoringService             jobScoringService;
    private final UserRepository                userRepository;
    private final FeatureConfig                 featureConfig;
    private final AiProviderFactory             aiProviderFactory;
    private final SearchKeywordGeneratorService keywordGeneratorService;
    private final Executor                      executor;

    public JobService(JobRepository jobRepository,
                      ScraperOrchestrator scraperOrchestrator,
                      JobScoringService jobScoringService,
                      UserRepository userRepository,
                      FeatureConfig featureConfig,
                      AiProviderFactory aiProviderFactory,
                      SearchKeywordGeneratorService keywordGeneratorService,
                      @Qualifier("virtualThreadExecutor") Executor executor) {
        this.jobRepository           = jobRepository;
        this.scraperOrchestrator     = scraperOrchestrator;
        this.jobScoringService       = jobScoringService;
        this.userRepository          = userRepository;
        this.featureConfig           = featureConfig;
        this.aiProviderFactory       = aiProviderFactory;
        this.keywordGeneratorService = keywordGeneratorService;
        this.executor                = executor;
    }

    public PagedResponse<JobResponse> searchJobs(String query, String location,
                                                 String source, int page, int size) {
        return searchJobs(query, location, source, page, size, null, null, null, 30);
    }

    public PagedResponse<JobResponse> searchJobs(String query, String location,
                                                 String source, int page, int size,
                                                 String userId) {
        return searchJobs(query, location, source, page, size, userId, null, null, 30);
    }

    public PagedResponse<JobResponse> searchJobs(String query, String location,
                                                 String source, int page, int size,
                                                 String userId, Long minSalary, Long maxSalary) {
        return searchJobs(query, location, source, page, size, userId, minSalary, maxSalary, 30);
    }

    public PagedResponse<JobResponse> searchJobs(String query, String location,
                                                 String source, int page, int size,
                                                 String userId, Long minSalary, Long maxSalary,
                                                 int maxAgeDays) {

        User user = (userId != null) ? userRepository.findById(userId).orElse(null) : null;

        String effectiveQuery = (query != null) ? query.strip() : "";
        String generatedQuery = null;

        if (effectiveQuery.isBlank() && user != null) {
            String aiKeyword = keywordGeneratorService.generateKeywords(user, location);
            if (!aiKeyword.isBlank()) {
                generatedQuery = aiKeyword;
                effectiveQuery = aiKeyword;
                log.info("Using AI-generated keyword '{}' for userId={}", effectiveQuery, userId);
            } else {

                log.info("Skipping search for userId={}: no query and no profile context", userId);
                return new PagedResponse<>(List.of(), 0, 0, page, size, null);
            }
        }

        final String searchQuery = effectiveQuery;

        CompletableFuture<List<JobResponse>> scrapeFuture = CompletableFuture.supplyAsync(
                () -> scraperOrchestrator.searchJobs(searchQuery, location, page), executor);

        CompletableFuture<Page<Job>> dbFuture = CompletableFuture.supplyAsync(
                () -> (source != null && !source.isBlank())
                        ? jobRepository.searchJobsBySource(searchQuery, source, PageRequest.of(page, size))
                        : jobRepository.searchJobs(searchQuery, PageRequest.of(page, size)),
                executor);

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

        List<JobResponse> scraped = scrapeFuture.getNow(List.of());
        Page<Job>         dbPage  = dbFuture.getNow(null);

        if (!scraped.isEmpty()) {
            final List<JobResponse> toCache = scraped;
            CompletableFuture.runAsync(() -> cacheJobs(toCache), executor);
        }

        List<JobResponse> candidates;
        long totalElements;
        int  totalPages;

        if (dbPage != null && dbPage.hasContent()) {
            candidates    = dbPage.getContent().stream().map(this::toJobResponse).toList();
            totalElements = dbPage.getTotalElements();
            totalPages    = dbPage.getTotalPages();
        } else {
            int total = scraped.size();
            int from  = page * size;
            int to    = Math.min(from + size, total);
            candidates    = from < total ? scraped.subList(from, to) : List.of();
            totalElements = total;
            totalPages    = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        }

        if (user != null) {
            candidates = jobScoringService.scoreAndFilterBatch(user, candidates);
        }

        if (minSalary != null || maxSalary != null) {
            candidates = candidates.stream()
                    .filter(j -> salaryInRange(j, minSalary, maxSalary))
                    .toList();
        }

        if (maxAgeDays > 0) {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(maxAgeDays);
            candidates = candidates.stream()
                    .filter(j -> j.datePosted() == null || !j.datePosted().isBefore(cutoff))
                    .toList();
        }

        if (!SecurityUtils.isAdmin()) {
            SubscriptionTier tier = (user != null) ? user.getSubscriptionTier() : SubscriptionTier.FREE;
            int maxResults = featureConfig.maxJobResults(tier);
            if (maxResults != Integer.MAX_VALUE && candidates.size() > maxResults) {
                candidates    = candidates.subList(0, maxResults);
                totalElements = maxResults;
                totalPages    = 1;
            }
        }

        return new PagedResponse<>(candidates, totalElements, totalPages, page, size, generatedQuery);
    }

    public Map<String, Long> getSourceCounts(String query, String location) {
        List<JobResponse> scraped = scraperOrchestrator.searchJobs(query, location, 0);
        return scraped.stream()
                .filter(j -> j.source() != null)
                .collect(Collectors.groupingBy(JobResponse::source, Collectors.counting()));
    }

    public JobResponse getJob(String id) {
        return toJobResponse(getJobEntity(id));
    }

    public JobResponse summarize(String jobId, String userId) {

        if (!SecurityUtils.isAdmin()) {
            SubscriptionTier tier = userRepository.findById(userId != null ? userId : "")
                    .map(u -> u.getSubscriptionTier() != null ? u.getSubscriptionTier() : SubscriptionTier.FREE)
                    .orElse(SubscriptionTier.FREE);
            if (!featureConfig.canSummarize(tier)) {
                throw new com.kaddy.autoapply.exception.BadRequestException(
                        "Job summarization requires a Gold or Platinum subscription.");
            }
        }
        Job job = getJobEntity(jobId);
        if (job.getAiSummary() != null && !job.getAiSummary().isBlank()) {
            return toJobResponse(job);
        }
        String userPrompt = "Job Title: " + job.getTitle() +
                "\nCompany: " + job.getCompany() +
                "\n\nDescription:\n" + (job.getDescription() != null ? job.getDescription() : "");
        try {
            AiProviderFactory.GenerationResult result =
                    aiProviderFactory.generate(SUMMARIZE_SYSTEM, userPrompt, AiProviderFactory.TaskType.FAST_TEXT);
            job.setAiSummary(result.content());
            jobRepository.save(job);
        } catch (Exception e) {
            log.warn("AI summarize failed for job {}: {}", jobId, e.getMessage());
        }
        return toJobResponse(job);
    }

    public JobResponse matchJob(String userId, String jobId) {
        Job job = getJobEntity(jobId);
        JobResponse base = toJobResponse(job);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return base;
        List<JobResponse> scored = jobScoringService.scoreAndFilterBatch(user, List.of(base));
        return scored.isEmpty() ? base : scored.get(0);
    }

    @Cacheable(value = "jobs", key = "#id")
    public Job getJobEntity(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
    }

    private boolean salaryInRange(JobResponse job, Long minSalary, Long maxSalary) {
        Double usd = job.normalizedSalaryUsd();
        if (usd == null || usd <= 0) return true;
        if (minSalary != null && usd < minSalary)  return false;
        if (maxSalary != null && usd > maxSalary)  return false;
        return true;
    }

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
        ).withSummary(job.getAiSummary());
    }
}
