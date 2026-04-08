package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.request.ApplyRequest;
import com.kaddy.autoapply.dto.response.ApplicationResponse;
import com.kaddy.autoapply.dto.response.JobResponse;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Application;
import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import com.kaddy.autoapply.repository.ApplicationRepository;
import com.kaddy.autoapply.repository.ResumeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);

    private final ApplicationRepository applicationRepository;
    private final JobService jobService;
    private final ResumeRepository resumeRepository;

    public ApplicationService(ApplicationRepository applicationRepository,
                               JobService jobService,
                               ResumeRepository resumeRepository) {
        this.applicationRepository = applicationRepository;
        this.jobService = jobService;
        this.resumeRepository = resumeRepository;
    }

    public ApplicationResponse apply(String userId, ApplyRequest request) {
        if (applicationRepository.existsByUserIdAndJobId(userId, request.jobId())) {
            throw new BadRequestException("Already applied to this job");
        }

        Job job = jobService.getJobEntity(request.jobId());
        String resumeId = Optional.ofNullable(request.resumeId())
                .orElseGet(() -> resumeRepository.findByUserIdAndIsPrimaryTrue(userId)
                        .map(Resume::getId).orElse(null));

        Application app = applicationRepository.save(Application.builder()
                .userId(userId).jobId(job.getId())
                .coverLetterId(request.coverLetterId())
                .resumeId(resumeId)
                .status(ApplicationStatus.APPLIED)
                .notes(request.notes())
                .build());

        return toResponse(app, job);
    }

    public List<ApplicationResponse> bulkApply(String userId, List<ApplyRequest> requests) {
        return requests.stream()
                .map(req -> {
                    try {
                        return apply(userId, req);
                    } catch (BadRequestException e) {
                        log.debug("Skipping job {} in bulk apply: {}", req.jobId(), e.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    public Page<ApplicationResponse> getUserApplications(String userId, String status,
                                                          int page, int size) {
        Page<Application> apps = (status != null && !status.isBlank())
                ? applicationRepository.findByUserIdAndStatusOrderByAppliedAtDesc(
                        userId, parseStatus(status), PageRequest.of(page, size))
                : applicationRepository.findByUserIdOrderByAppliedAtDesc(
                        userId, PageRequest.of(page, size));

        return apps.map(app -> {
            Job job = null;
            try {
                job = jobService.getJobEntity(app.getJobId());
            } catch (ResourceNotFoundException e) {
                log.debug("Job {} not found for application {}: {}", app.getJobId(), app.getId(), e.getMessage());
            }
            return toResponse(app, job);
        });
    }

    private ApplicationStatus parseStatus(String status) {
        try {
            return ApplicationStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + status);
        }
    }

    public ApplicationResponse updateStatus(String id, String newStatus) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Application not found"));
        app.setStatus(parseStatus(newStatus));
        app.setStatusUpdated(LocalDateTime.now());
        app = applicationRepository.save(app);

        Job job = null;
        try {
            job = jobService.getJobEntity(app.getJobId());
        } catch (ResourceNotFoundException e) {
            log.debug("Job {} not found for application {}: {}", app.getJobId(), app.getId(), e.getMessage());
        }
        return toResponse(app, job);
    }

    public void delete(String id) {
        applicationRepository.deleteById(id);
    }

    private ApplicationResponse toResponse(Application app, Job job) {
        JobResponse jr = Optional.ofNullable(job).map(j -> new JobResponse(
                j.getId(), j.getExternalId(), j.getSource().name(),
                j.getTitle(), j.getCompany(), j.getLocation(),
                j.getUrl(), null, j.getSalary(), null,
                j.getJobType(), j.getDatePosted(), null)).orElse(null);

        return new ApplicationResponse(
                app.getId(), jr, app.getStatus().name(), app.getMatchScore(),
                app.getNotes(), app.getAppliedAt(), app.getStatusUpdated(),
                app.getCoverLetterId() != null
        );
    }
}
