package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.FeatureConfig;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.AutoApplyJob;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.enums.FeatureType;
import com.kaddy.autoapply.model.event.AutoApplyJobQueuedEvent;
import com.kaddy.autoapply.repository.AutoApplyJobRepository;
import com.kaddy.autoapply.repository.JobRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class AutoApplyService {

    private static final Logger log = LoggerFactory.getLogger(AutoApplyService.class);

    private final AutoApplyJobRepository autoApplyJobRepository;
    private final UserRepository         userRepository;
    private final JobRepository          jobRepository;
    private final FeatureConfig          featureConfig;
    private final ApplicationEventPublisher eventPublisher;
    private final Executor               executor;
    private final FeatureUsageService    featureUsageService;

    public AutoApplyService(AutoApplyJobRepository autoApplyJobRepository,
                            UserRepository userRepository,
                            JobRepository jobRepository,
                            FeatureConfig featureConfig,
                            ApplicationEventPublisher eventPublisher,
                            @Qualifier("virtualThreadExecutor") Executor executor,
                            FeatureUsageService featureUsageService) {
        this.autoApplyJobRepository = autoApplyJobRepository;
        this.userRepository         = userRepository;
        this.jobRepository          = jobRepository;
        this.featureConfig          = featureConfig;
        this.eventPublisher         = eventPublisher;
        this.executor               = executor;
        this.featureUsageService    = featureUsageService;
    }

    public List<AutoApplyJob> queueJobs(String userId, List<String> jobIds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found."));

        if (!SecurityUtils.isAdmin()
                && !featureConfig.canAutoApply(user.getSubscriptionTier())) {
            throw new BadRequestException(
                    "Auto-apply requires a Platinum subscription. Please upgrade.");
        }

        List<AutoApplyJob> queued = jobIds.stream().map(jobId -> {
            Job job = jobRepository.findById(jobId).orElse(null);
            AutoApplyJob aj = new AutoApplyJob();
            aj.setUserId(userId);
            aj.setJobId(jobId);
            aj.setJobTitle(job != null ? job.getTitle() : "Unknown");
            aj.setCompany(job != null ? job.getCompany() : "Unknown");
            aj.setJobUrl(job != null ? job.getUrl() : "");
            aj.setStatus("QUEUED");
            return aj;
        }).toList();

        List<AutoApplyJob> saved = autoApplyJobRepository.saveAll(queued);
        log.info("Queued {} auto-apply jobs for user {}", saved.size(), userId);

        for (AutoApplyJob aj : saved) {
            final AutoApplyJobQueuedEvent event =
                    new AutoApplyJobQueuedEvent(userId, aj.getJobId(), aj.getId());
            CompletableFuture.runAsync(() -> eventPublisher.publishEvent(event), executor);
            featureUsageService.record(userId, FeatureType.AUTO_APPLY_SUBMITTED, aj.getId());
        }

        return saved;
    }

    public List<AutoApplyJob> getQueue(String userId) {
        return autoApplyJobRepository.findByUserIdOrderByQueuedAtDesc(userId);
    }
}
