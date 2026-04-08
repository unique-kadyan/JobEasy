package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.request.CoverLetterRequest;
import com.kaddy.autoapply.dto.response.CoverLetterResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

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

    private final CoverLetterRepository coverLetterRepository;
    private final UserRepository userRepository;
    private final TemplateRepository templateRepository;
    private final JobService jobService;
    private final AiProviderFactory aiProviderFactory;

    public CoverLetterService(CoverLetterRepository coverLetterRepository,
                               UserRepository userRepository,
                               TemplateRepository templateRepository,
                               JobService jobService,
                               AiProviderFactory aiProviderFactory) {
        this.coverLetterRepository = coverLetterRepository;
        this.userRepository = userRepository;
        this.templateRepository = templateRepository;
        this.jobService = jobService;
        this.aiProviderFactory = aiProviderFactory;
    }

    public CoverLetterResponse generate(String userId, CoverLetterRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Job job = jobService.getJobEntity(request.jobId());

        StringBuilder prompt = new StringBuilder();
        prompt.append("CANDIDATE PROFILE:\nName: ").append(user.getName()).append("\n");
        if (user.getTitle() != null)   prompt.append("Title: ").append(user.getTitle()).append("\n");
        if (user.getSummary() != null) prompt.append("Summary: ").append(user.getSummary()).append("\n");
        if (user.getSkills() != null)  prompt.append("Skills: ").append(user.getSkills()).append("\n");
        prompt.append("\nJOB DETAILS:\nTitle: ").append(job.getTitle()).append("\n");
        prompt.append("Company: ").append(job.getCompany()).append("\n");
        if (job.getLocation() != null)    prompt.append("Location: ").append(job.getLocation()).append("\n");
        if (job.getDescription() != null) prompt.append("Description: ").append(job.getDescription()).append("\n");

        Template template = null;
        if (request.templateId() != null) {
            template = templateRepository.findById(request.templateId()).orElse(null);
            if (template != null) {
                prompt.append("\nTEMPLATE STYLE:\n").append(template.getContent()).append("\n");
            }
        }

        AiProviderFactory.GenerationResult result =
                aiProviderFactory.generate(SYSTEM_PROMPT, prompt.toString(), request.provider());

        CoverLetter cl = coverLetterRepository.save(CoverLetter.builder()
                .userId(userId)
                .jobId(job.getId())
                .templateId(template != null ? template.getId() : null)
                .content(result.content())
                .aiProvider(result.providerName())
                .aiModel(request.provider())
                .promptUsed(prompt.toString())
                .build());

        return toResponse(cl, job);
    }

    public Page<CoverLetterResponse> getUserCoverLetters(String userId, int page, int size) {
        return coverLetterRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(cl -> {
                    Job job = cl.getJobId() != null ? safeGetJob(cl.getJobId()) : null;
                    return toResponse(cl, job);
                });
    }

    public CoverLetterResponse getCoverLetter(String id) {
        CoverLetter cl = coverLetterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cover letter not found"));
        return toResponse(cl, cl.getJobId() != null ? safeGetJob(cl.getJobId()) : null);
    }

    public CoverLetterResponse update(String id, String content) {
        CoverLetter cl = coverLetterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cover letter not found"));
        cl.setContent(content);
        cl = coverLetterRepository.save(cl);
        return toResponse(cl, cl.getJobId() != null ? safeGetJob(cl.getJobId()) : null);
    }

    public void delete(String id) {
        coverLetterRepository.deleteById(id);
    }

    private Job safeGetJob(String jobId) {
        try {
            return jobService.getJobEntity(jobId);
        } catch (Exception e) {
            log.debug("Job {} not found when loading cover letter: {}", jobId, e.getMessage());
            return null;
        }
    }

    private CoverLetterResponse toResponse(CoverLetter cl, Job job) {
        return new CoverLetterResponse(
                cl.getId(),
                job != null ? job.getId() : null,
                job != null ? job.getTitle() : null,
                job != null ? job.getCompany() : null,
                cl.getContent(), cl.getAiProvider(), cl.getAiModel(), cl.getCreatedAt()
        );
    }
}
