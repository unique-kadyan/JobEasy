package com.kaddy.autoapply.service;

import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.ResumeRepository;
import com.kaddy.autoapply.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    private final ResumeRepository resumeRepository;
    private final ResumeParserService parserService;
    private final UserRepository userRepository;
    private final JobService jobService;
    private final ResumeProfileService resumeProfileService;
    private final String uploadDir;

    public ResumeService(ResumeRepository resumeRepository,
                         ResumeParserService parserService,
                         UserRepository userRepository,
                         @Lazy JobService jobService,
                         @Lazy ResumeProfileService resumeProfileService,
                         @Value("${app.upload.dir}") String uploadDir) {
        this.resumeRepository = resumeRepository;
        this.parserService = parserService;
        this.userRepository = userRepository;
        this.jobService = jobService;
        this.resumeProfileService = resumeProfileService;
        this.uploadDir = uploadDir;
    }

    public Resume upload(String userId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        String contentType = file.getContentType();
        if (!"application/pdf".equals(contentType)) {
            throw new BadRequestException("Only PDF files are supported");
        }

        try {
            Path uploadPath = Paths.get(uploadDir, userId);
            Files.createDirectories(uploadPath);

            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
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
            Thread.ofVirtual().start(() -> {
                try {
                    resumeProfileService.parseAndSave(userId, savedId, finalText);
                } catch (Exception e) {
                    log.debug("Resume profile parse failed for user {}: {}", userId, e.getMessage());
                }
            });

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

            Thread.ofVirtual().start(() -> {
                try {
                    jobService.searchJobs(query, null, null, 0, 10, userId);
                    log.info("Auto job search triggered for user {} with query: {}", userId, query);
                } catch (Exception e) {
                    log.debug("Auto job search after upload failed for user {}: {}", userId, e.getMessage());
                }
            });
        } catch (Exception e) {
            log.debug("Could not trigger auto search after upload: {}", e.getMessage());
        }
    }

    private String buildQueryFromParsedData(Map<String, Object> parsedData, User user) {
        if (user != null && user.getTitle() != null && !user.getTitle().isBlank()) {
            return user.getTitle();
        }
        if (parsedData != null && parsedData.get("skills") instanceof java.util.Collection<?> skills) {
            return skills.stream().limit(5)
                    .map(Object::toString)
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
        }
        return "";
    }

    public List<Resume> getUserResumes(String userId) {
        return resumeRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @PostAuthorize("returnObject.userId == authentication.principal or hasRole('ADMIN')")
    public Resume getResume(String userId, String id) {
        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
        if (!resume.getUserId().equals(userId) && !SecurityUtils.isAdmin()) {
            throw new BadRequestException("Resume does not belong to the current user");
        }
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
