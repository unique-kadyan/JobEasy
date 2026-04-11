package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.FeatureConfig;
import com.kaddy.autoapply.dto.request.CoverLetterRequest;
import com.kaddy.autoapply.dto.response.CoverLetterResponse;
import com.kaddy.autoapply.model.enums.FeatureType;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.event.AutoApplyJobQueuedEvent;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.model.AutoApplyJob;
import com.kaddy.autoapply.model.CoverLetter;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.Template;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.AutoApplyJobRepository;
import com.kaddy.autoapply.repository.CoverLetterRepository;
import com.kaddy.autoapply.repository.TemplateRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class CoverLetterService {

    private static final Logger log = LoggerFactory.getLogger(CoverLetterService.class);

    private static final String SYSTEM_PROMPT = """
            You are an expert career coach and professional cover letter writer.
            Write a compelling, personalized cover letter based on the candidate's profile and the job description.
            The cover letter should:
            - Be professionally formatted
            - Highlight relevant skills and experiences that match the job requirements
            - Show genuine interest in the company and role
            - Be concise (3-4 paragraphs)
            - Use a confident but not arrogant tone
            Do NOT include any placeholder text like [Your Name] — use actual values provided.
            Return ONLY the cover letter text.""";

    private static final long LOOKUP_TIMEOUT_SECONDS = 5;

    private final CoverLetterRepository coverLetterRepository;
    private final UserRepository userRepository;
    private final TemplateRepository templateRepository;
    private final JobService jobService;
    private final AiProviderFactory aiProviderFactory;
    private final Executor executor;
    private final AutoApplyJobRepository autoApplyJobRepository;
    private final FeatureConfig featureConfig;
    private final StringRedisTemplate redis;
    private final FeatureUsageService featureUsageService;

    public CoverLetterService(CoverLetterRepository coverLetterRepository,
            UserRepository userRepository,
            TemplateRepository templateRepository,
            JobService jobService,
            AiProviderFactory aiProviderFactory,
            @Qualifier("virtualThreadExecutor") Executor executor,
            AutoApplyJobRepository autoApplyJobRepository,
            FeatureConfig featureConfig,
            StringRedisTemplate redis,
            FeatureUsageService featureUsageService) {
        this.coverLetterRepository = coverLetterRepository;
        this.userRepository = userRepository;
        this.templateRepository = templateRepository;
        this.jobService = jobService;
        this.aiProviderFactory = aiProviderFactory;
        this.executor = executor;
        this.autoApplyJobRepository = autoApplyJobRepository;
        this.featureConfig = featureConfig;
        this.redis = redis;
        this.featureUsageService = featureUsageService;
    }

    @Async
    @EventListener
    public void onAutoApplyJobQueued(AutoApplyJobQueuedEvent event) {
        try {
            CoverLetterResponse cl = generate(event.userId(),
                    new CoverLetterRequest(event.jobId(), null, null));
            autoApplyJobRepository.findById(event.autoApplyJobId()).ifPresent(aj -> {
                aj.setCoverLetterId(cl.id());
                autoApplyJobRepository.save(aj);
            });
        } catch (Exception e) {
            log.debug("Cover letter generation failed for auto-apply job {}: {}",
                    event.autoApplyJobId(), e.getMessage());
        }
    }

    @PreAuthorize("isAuthenticated()")
    public CoverLetterResponse generate(String userId, CoverLetterRequest request) {
        if (!SecurityUtils.isAdmin()) {
            User limitUser = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            int maxPerDay = featureConfig.maxCoverLettersPerDay(limitUser.getSubscriptionTier());
            if (maxPerDay != Integer.MAX_VALUE) {
                String dailyKey = "cl:daily:" + userId + ":" + LocalDate.now();
                Long count = redis.opsForValue().increment(dailyKey);
                if (count != null && count == 1) {
                    redis.expire(dailyKey, Duration.ofHours(25));
                }
                if (count != null && count > maxPerDay) {
                    throw new BadRequestException(
                            "Daily cover letter limit of " + maxPerDay + " reached on your "
                            + limitUser.getSubscriptionTier().name().toLowerCase()
                            + " plan. Upgrade to generate more.");
                }
            }
        }

        CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(
                () -> userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")),
                executor);

        CompletableFuture<Job> jobFuture = CompletableFuture.supplyAsync(
                () -> jobService.getJobEntity(request.jobId()),
                executor);

        User user;
        Job job;
        try {
            CompletableFuture.allOf(userFuture, jobFuture)
                    .get(LOOKUP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            user = userFuture.join();
            job = jobFuture.join();
        } catch (TimeoutException e) {
            throw new BadRequestException("Data lookup timed out — please retry");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Request interrupted");
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof RuntimeException re)
                throw re;
            throw new BadRequestException("Failed to load required data: " + cause.getMessage());
        }

        StringBuilder prompt = new StringBuilder();
        prompt.append("CANDIDATE PROFILE:\nName: ")
                .append(Optional.ofNullable(user.getName()).orElse("")).append("\n");
        Optional.ofNullable(user.getTitle()).ifPresent(v -> prompt.append("Title: ").append(v).append("\n"));
        Optional.ofNullable(user.getSummary()).ifPresent(v -> prompt.append("Summary: ").append(v).append("\n"));
        Optional.ofNullable(user.getSkills()).ifPresent(v -> prompt.append("Skills: ").append(v).append("\n"));
        prompt.append("\nJOB DETAILS:\nTitle: ")
                .append(sanitizeForPrompt(job.getTitle(), 120)).append("\n");
        prompt.append("Company: ")
                .append(sanitizeForPrompt(job.getCompany(), 120)).append("\n");
        Optional.ofNullable(job.getLocation()).ifPresent(v ->
                prompt.append("Location: ").append(sanitizeForPrompt(v, 120)).append("\n"));
        Optional.ofNullable(job.getDescription()).ifPresent(v ->
                prompt.append("Description: ").append(sanitizeForPrompt(v, 4000)).append("\n"));

        Optional<Template> templateOpt = Optional.ofNullable(request.templateId())
                .flatMap(templateRepository::findById);
        templateOpt.ifPresent(t -> prompt.append("\nTEMPLATE STYLE:\n").append(t.getContent()).append("\n"));

        AiProviderFactory.GenerationResult result = (request.provider() != null && !request.provider().isBlank())
                ? aiProviderFactory.generate(SYSTEM_PROMPT, prompt.toString(), request.provider())
                : aiProviderFactory.generate(SYSTEM_PROMPT, prompt.toString(), AiProviderFactory.TaskType.COVER_LETTER);

        CoverLetter cl = coverLetterRepository.save(CoverLetter.builder()
                .userId(userId)
                .jobId(job.getId())
                .templateId(templateOpt.map(Template::getId).orElse(null))
                .content(result.content())
                .aiProvider(result.providerName())
                .aiModel(request.provider())
                .promptUsed(prompt.toString())
                .build());

        featureUsageService.record(userId, FeatureType.COVER_LETTER_GENERATED, cl.getId());

        return toResponse(cl, job);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public Page<CoverLetterResponse> getUserCoverLetters(String userId, int page, int size) {
        return coverLetterRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(cl -> toResponse(cl, Optional.ofNullable(cl.getJobId())
                        .flatMap(id -> Optional.ofNullable(safeGetJob(id))).orElse(null)));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public CoverLetterResponse getCoverLetter(String userId, String id) {
        CoverLetter cl = findOwned(userId, id);
        return toResponse(cl, Optional.ofNullable(cl.getJobId())
                .flatMap(jid -> Optional.ofNullable(safeGetJob(jid))).orElse(null));
    }

    @PreAuthorize("isAuthenticated()")
    public CoverLetterResponse update(String userId, String id, String content) {
        CoverLetter cl = findOwned(userId, id);
        cl.setContent(content);
        cl = coverLetterRepository.save(cl);
        return toResponse(cl, Optional.ofNullable(cl.getJobId())
                .flatMap(jid -> Optional.ofNullable(safeGetJob(jid))).orElse(null));
    }

    @PreAuthorize("isAuthenticated()")
    public void delete(String userId, String id) {
        findOwned(userId, id);
        coverLetterRepository.deleteById(id);
    }

    /**
     * Strips prompt-injection payloads from externally-sourced strings (job titles,
     * descriptions, company names) before embedding them in AI prompts.
     * Removes role-switch keywords, control characters, and code-fence sequences,
     * then truncates to the given character limit.
     */
    private String sanitizeForPrompt(String value, int maxChars) {
        if (value == null) return "";
        return value
                .replaceAll("(?i)\\b(SYSTEM|HUMAN|ASSISTANT|USER)\\s*:", "")
                .replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "")
                .replace("```", "'''")
                .stripLeading()
                .substring(0, Math.min(value.length(), maxChars));
    }

    private CoverLetter findOwned(String userId, String id) {
        CoverLetter cl = coverLetterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cover letter not found"));
        SecurityUtils.assertOwnerOrAdmin(cl.getUserId(), userId);
        return cl;
    }

    private Job safeGetJob(String jobId) {
        try {
            return jobService.getJobEntity(jobId);
        } catch (ResourceNotFoundException e) {
            log.debug("Job {} not found when loading cover letter: {}", jobId, e.getMessage());
            return null;
        }
    }

    private CoverLetterResponse toResponse(CoverLetter cl, Job job) {
        Optional<Job> optJob = Optional.ofNullable(job);
        return new CoverLetterResponse(
                cl.getId(),
                optJob.map(Job::getId).orElse(null),
                optJob.map(Job::getTitle).orElse(null),
                optJob.map(Job::getCompany).orElse(null),
                cl.getContent(), cl.getAiProvider(), cl.getAiModel(), cl.getCreatedAt());
    }
}
