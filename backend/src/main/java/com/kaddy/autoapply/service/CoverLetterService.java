package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.request.CoverLetterRequest;
import com.kaddy.autoapply.dto.response.CoverLetterResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.model.CoverLetter;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.Template;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.CoverLetterRepository;
import com.kaddy.autoapply.repository.TemplateRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Cover-letter generation and management service.
 *
 * <h3>Parallel I/O in {@link #generate}</h3>
 * <p>Generating a cover letter requires two independent data lookups before the
 * AI prompt can be assembled:
 * <ol>
 *   <li>Fetch the caller's {@link User} profile (skills, summary, name).</li>
 *   <li>Fetch the target {@link Job} entity (title, company, description).</li>
 * </ol>
 * <p>These two MongoDB reads have no data dependency on each other.  Firing them
 * concurrently on virtual threads halves the lookup latency (≈ 10 ms → 10 ms
 * instead of ≈ 20 ms) before the AI call — the dominant cost — even begins.
 *
 * <h3>Ownership enforcement</h3>
 * <p>All write/read operations on an existing cover letter go through
 * {@link #findOwned}, which throws {@link BadRequestException} if the requesting
 * user does not own the document.
 */
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

    /** Timeout for the parallel user + job lookup phase. */
    private static final long LOOKUP_TIMEOUT_SECONDS = 5;

    private final CoverLetterRepository coverLetterRepository;
    private final UserRepository        userRepository;
    private final TemplateRepository    templateRepository;
    private final JobService            jobService;
    private final AiProviderFactory     aiProviderFactory;
    private final Executor              executor;

    public CoverLetterService(CoverLetterRepository coverLetterRepository,
                               UserRepository userRepository,
                               TemplateRepository templateRepository,
                               JobService jobService,
                               AiProviderFactory aiProviderFactory,
                               @Qualifier("virtualThreadExecutor") Executor executor) {
        this.coverLetterRepository = coverLetterRepository;
        this.userRepository        = userRepository;
        this.templateRepository    = templateRepository;
        this.jobService            = jobService;
        this.aiProviderFactory     = aiProviderFactory;
        this.executor              = executor;
    }

    // ── Generation ────────────────────────────────────────────────────────────

    /**
     * Generates a cover letter using AI.
     *
     * <p>User profile and job data are fetched in parallel on virtual threads.
     * The AI call follows once both are resolved — it is the dominant latency
     * (typically 1–5 s) and cannot be parallelised further.
     */
    @PreAuthorize("isAuthenticated()")
    public CoverLetterResponse generate(String userId, CoverLetterRequest request) {
        // ── Parallel I/O: user profile + job entity fetched concurrently ──────
        CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(
                () -> userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")),
                executor);

        CompletableFuture<Job> jobFuture = CompletableFuture.supplyAsync(
                () -> jobService.getJobEntity(request.jobId()),
                executor);

        User user;
        Job  job;
        try {
            CompletableFuture.allOf(userFuture, jobFuture)
                    .get(LOOKUP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            user = userFuture.join();
            job  = jobFuture.join();
        } catch (TimeoutException e) {
            throw new BadRequestException("Data lookup timed out — please retry");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Request interrupted");
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof RuntimeException re) throw re;
            throw new BadRequestException("Failed to load required data: " + cause.getMessage());
        }

        // ── Build prompt ───────────────────────────────────────────────────────
        StringBuilder prompt = new StringBuilder();
        prompt.append("CANDIDATE PROFILE:\nName: ")
                .append(Optional.ofNullable(user.getName()).orElse("")).append("\n");
        Optional.ofNullable(user.getTitle()).ifPresent(v -> prompt.append("Title: ").append(v).append("\n"));
        Optional.ofNullable(user.getSummary()).ifPresent(v -> prompt.append("Summary: ").append(v).append("\n"));
        Optional.ofNullable(user.getSkills()).ifPresent(v -> prompt.append("Skills: ").append(v).append("\n"));
        prompt.append("\nJOB DETAILS:\nTitle: ")
                .append(Optional.ofNullable(job.getTitle()).orElse("")).append("\n");
        prompt.append("Company: ")
                .append(Optional.ofNullable(job.getCompany()).orElse("")).append("\n");
        Optional.ofNullable(job.getLocation()).ifPresent(v -> prompt.append("Location: ").append(v).append("\n"));
        Optional.ofNullable(job.getDescription()).ifPresent(v -> prompt.append("Description: ").append(v).append("\n"));

        Optional<Template> templateOpt = Optional.ofNullable(request.templateId())
                .flatMap(templateRepository::findById);
        templateOpt.ifPresent(t ->
                prompt.append("\nTEMPLATE STYLE:\n").append(t.getContent()).append("\n"));

        // ── AI call (blocking — virtual thread parks during I/O) ───────────────
        AiProviderFactory.GenerationResult result =
                aiProviderFactory.generate(SYSTEM_PROMPT, prompt.toString(), request.provider());

        CoverLetter cl = coverLetterRepository.save(CoverLetter.builder()
                .userId(userId)
                .jobId(job.getId())
                .templateId(templateOpt.map(Template::getId).orElse(null))
                .content(result.content())
                .aiProvider(result.providerName())
                .aiModel(request.provider())
                .promptUsed(prompt.toString())
                .build());

        return toResponse(cl, job);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @PreAuthorize("isAuthenticated()")
    public Page<CoverLetterResponse> getUserCoverLetters(String userId, int page, int size) {
        return coverLetterRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(cl -> toResponse(cl, Optional.ofNullable(cl.getJobId())
                        .flatMap(id -> Optional.ofNullable(safeGetJob(id))).orElse(null)));
    }

    @PreAuthorize("isAuthenticated()")
    public CoverLetterResponse getCoverLetter(String userId, String id) {
        CoverLetter cl = findOwned(userId, id);
        return toResponse(cl, Optional.ofNullable(cl.getJobId())
                .flatMap(jid -> Optional.ofNullable(safeGetJob(jid))).orElse(null));
    }

    // ── Write ─────────────────────────────────────────────────────────────────

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

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CoverLetter findOwned(String userId, String id) {
        CoverLetter cl = coverLetterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cover letter not found"));
        if (!cl.getUserId().equals(userId) && !SecurityUtils.isAdmin()) {
            throw new BadRequestException("Cover letter does not belong to the current user");
        }
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
                cl.getContent(), cl.getAiProvider(), cl.getAiModel(), cl.getCreatedAt()
        );
    }
}
