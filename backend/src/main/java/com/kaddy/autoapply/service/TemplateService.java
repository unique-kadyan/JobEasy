package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.security.InputSanitizer;
import com.kaddy.autoapply.dto.request.TemplateRequest;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.Template;
import com.kaddy.autoapply.repository.TemplateRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final InputSanitizer sanitizer;

    public TemplateService(TemplateRepository templateRepository, InputSanitizer sanitizer) {
        this.templateRepository = templateRepository;
        this.sanitizer = sanitizer;
    }

    public List<Template> getTemplatesForUser(String userId) {
        return templateRepository.findAllForUser(userId);
    }

    public Template create(String userId, TemplateRequest request) {
        return templateRepository.save(Template.builder()
                .userId(userId)
                .name(sanitizer.sanitize(request.name()))
                .content(request.content())
                .description(sanitizer.sanitize(request.description()))
                .isSystem(false)
                .build());
    }

    public Template update(String userId, String templateId, TemplateRequest request) {
        Template template = findTemplate(templateId);
        if (Boolean.TRUE.equals(template.getIsSystem())) {
            throw new BadRequestException("Cannot edit system templates");
        }
        if (template.getUserId() == null || !template.getUserId().equals(userId)) {
            throw new BadRequestException("You can only edit your own templates");
        }
        template.setName(sanitizer.sanitize(request.name()));
        template.setContent(request.content());
        template.setDescription(sanitizer.sanitize(request.description()));
        return templateRepository.save(template);
    }

    public void delete(String userId, String templateId) {
        Template template = findTemplate(templateId);
        if (Boolean.TRUE.equals(template.getIsSystem())) {
            throw new BadRequestException("Cannot delete system templates");
        }
        if (template.getUserId() == null || !template.getUserId().equals(userId)) {
            throw new BadRequestException("You can only delete your own templates");
        }
        templateRepository.delete(template);
    }

    private Template findTemplate(String templateId) {
        return templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
    }
}
