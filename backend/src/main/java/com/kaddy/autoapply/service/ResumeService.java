package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.FeatureConfig;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.ResumeRepository;
import com.kaddy.autoapply.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    private final ResumeRepository resumeRepository;
    private final ResumeParserService parserService;
    private final UserRepository userRepository;
    private final JobService jobService;
    private final ResumeProfileService resumeProfileService;
    private final FeatureConfig featureConfig;
    private final String uploadDir;
    private final Executor executor;

    public ResumeService(ResumeRepository resumeRepository,
                         ResumeParserService parserService,
                         UserRepository userRepository,
                         @Lazy JobService jobService,
                         @Lazy ResumeProfileService resumeProfileService,
                         FeatureConfig featureConfig,
                         @Value("${app.upload.dir}") String uploadDir,
                         @Qualifier("virtualThreadExecutor") Executor executor) {
        this.resumeRepository = resumeRepository;
        this.parserService = parserService;
        this.userRepository = userRepository;
        this.jobService = jobService;
        this.resumeProfileService = resumeProfileService;
        this.featureConfig = featureConfig;
        this.uploadDir = uploadDir;
        this.executor = executor;
    }

    private static final byte[] PDF_MAGIC = {'%', 'P', 'D', 'F'};

    public Resume upload(String userId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        String contentType = file.getContentType();
        if (!"application/pdf".equals(contentType)) {
            throw new BadRequestException("Only PDF files are supported");
        }

        if (!SecurityUtils.isAdmin()) {
            User owner = userRepository.findById(userId)
                    .orElseThrow(() -> new BadRequestException("User not found"));
            int maxResumes = featureConfig.maxResumesUploaded(owner.getSubscriptionTier());
            if (maxResumes != Integer.MAX_VALUE) {
                long existing = resumeRepository.findByUserIdOrderByCreatedAtDesc(userId).size();
                if (existing >= maxResumes) {
                    throw new BadRequestException(
                            "Resume limit of " + maxResumes + " reached on your "
                            + owner.getSubscriptionTier().name().toLowerCase()
                            + " plan. Delete an existing resume or upgrade to upload more.");
                }
            }
        }

        try {
            byte[] header = file.getInputStream().readNBytes(4);
            if (header.length < 4 ||
                    header[0] != PDF_MAGIC[0] || header[1] != PDF_MAGIC[1] ||
                    header[2] != PDF_MAGIC[2] || header[3] != PDF_MAGIC[3]) {
                throw new BadRequestException("File does not appear to be a valid PDF");
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException e) {
            throw new BadRequestException("Failed to read file: " + e.getMessage());
        }

        try {
            Path uploadPath = Paths.get(uploadDir, userId);
            Files.createDirectories(uploadPath);

            String filename = UUID.randomUUID() + ".pdf";
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath);

            String parsedText = parserService.extractText(filePath);
            Map<String, Object> parsedData = parserService.parseStructuredData(parsedText);

            boolean isFirst = resumeRepository.findByUserIdOrderByCreatedAtDesc(userId).isEmpty();

            Resume resume = Resume.builder()
                    .userId(userId)
                    .filename(file.getOriginalFilename())
                    .filePath(filePath.toString())
                    .fileSize((int) file.getSize())
                    .contentType(contentType)
                    .parsedText(parsedText)
                    .parsedData(parsedData)
                    .isPrimary(isFirst)
                    .build();

            Resume saved = resumeRepository.save(resume);

            final String savedId   = saved.getId();
            final String finalText = parsedText;
            CompletableFuture.runAsync(() -> {
                try {
                    resumeProfileService.parseAndSave(userId, savedId, finalText);
                } catch (Exception e) {
                    log.debug("Resume profile parse failed for user {}: {}", userId, e.getMessage());
                }
            }, executor);

            triggerAutoSearch(userId, parsedData);

            return saved;
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload file: " + e.getMessage());
        }
    }

    private void triggerAutoSearch(String userId, Map<String, Object> parsedData) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            String query = buildQueryFromParsedData(parsedData, user);
            if (query.isBlank()) return;

            CompletableFuture.runAsync(() -> {
                try {
                    jobService.searchJobs(query, null, null, 0, 10, userId);
                    log.info("Auto job search triggered for user {} with query: {}", userId, query);
                } catch (Exception e) {
                    log.debug("Auto job search after upload failed for user {}: {}", userId, e.getMessage());
                }
            }, executor);
        } catch (Exception e) {
            log.debug("Could not trigger auto search after upload: {}", e.getMessage());
        }
    }

    private String buildQueryFromParsedData(Map<String, Object> parsedData, User user) {
        if (user != null && user.getTitle() != null && !user.getTitle().isBlank()) {
            return user.getTitle();
        }
        if (parsedData == null) return "";
        Object skillsRaw = parsedData.get("skills");
        if (skillsRaw instanceof Map<?, ?> skillsMap) {
            return skillsMap.values().stream()
                    .filter(v -> v instanceof List<?>)
                    .flatMap(v -> ((List<?>) v).stream())
                    .map(Object::toString)
                    .limit(5)
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
        }
        if (skillsRaw instanceof java.util.Collection<?> skills) {
            return skills.stream().limit(5)
                    .map(Object::toString)
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
        }
        return "";
    }

    public Page<Resume> getUserResumes(String userId, int page, int size) {
        return resumeRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }

    public Resume getResume(String userId, String id) {
        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
        SecurityUtils.assertOwnerOrAdmin(resume.getUserId(), userId);
        return resume;
    }

    public void setPrimary(String userId, String resumeId) {
        List<Resume> resumes = resumeRepository.findByUserIdOrderByCreatedAtDesc(userId);
        resumes.forEach(r -> r.setIsPrimary(r.getId().equals(resumeId)));
        resumeRepository.saveAll(resumes);
    }

    public void delete(String userId, String id) {
        Resume resume = getResume(userId, id);
        try {
            Files.deleteIfExists(Paths.get(resume.getFilePath()));
        } catch (IOException e) {
            log.warn("Could not delete resume file {}: {}", resume.getFilePath(), e.getMessage());
        }
        resumeRepository.delete(resume);
    }
}
