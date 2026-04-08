package com.kaddy.autoapply.service;

import com.kaddy.autoapply.config.security.InputSanitizer;
import com.kaddy.autoapply.dto.request.TemplateRequest;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.Template;
import com.kaddy.autoapply.repository.TemplateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TemplateServiceTest {

    @Mock private TemplateRepository templateRepository;
    @Mock private InputSanitizer sanitizer;
    @InjectMocks private TemplateService templateService;

    @Test
    void getTemplatesForUser_shouldReturnSystemAndUserTemplates() {
        var templates = List.of(
                Template.builder().id("t1").name("System").isSystem(true).build(),
                Template.builder().id("t2").name("Custom").userId("u1").isSystem(false).build()
        );
        when(templateRepository.findAllForUser("u1")).thenReturn(templates);

        assertEquals(2, templateService.getTemplatesForUser("u1").size());
    }

    @Test
    void create_shouldSanitizeAndSave() {
        var request = new TemplateRequest("My Template", "content", "desc");
        when(sanitizer.sanitize("My Template")).thenReturn("My Template");
        when(sanitizer.sanitize("desc")).thenReturn("desc");
        when(templateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Template result = templateService.create("u1", request);

        assertFalse(result.getIsSystem());
        verify(sanitizer).sanitize("My Template");
    }

    @Test
    void update_shouldRejectSystemTemplate() {
        var systemTemplate = Template.builder().id("t1").isSystem(true).build();
        when(templateRepository.findById("t1")).thenReturn(Optional.of(systemTemplate));

        var request = new TemplateRequest("Updated", "content", "desc");
        assertThrows(BadRequestException.class, () -> templateService.update("u1", "t1", request));
    }

    @Test
    void update_shouldRejectOtherUsersTemplate() {
        var template = Template.builder().id("t2").userId("other-user").isSystem(false).build();
        when(templateRepository.findById("t2")).thenReturn(Optional.of(template));

        var request = new TemplateRequest("Updated", "content", "desc");
        assertThrows(BadRequestException.class, () -> templateService.update("u1", "t2", request));
    }

    @Test
    void delete_shouldRejectSystemTemplate() {
        var systemTemplate = Template.builder().id("t1").isSystem(true).build();
        when(templateRepository.findById("t1")).thenReturn(Optional.of(systemTemplate));

        assertThrows(BadRequestException.class, () -> templateService.delete("u1", "t1"));
    }
}
