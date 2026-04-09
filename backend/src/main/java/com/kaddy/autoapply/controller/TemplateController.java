package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.request.TemplateRequest;
import com.kaddy.autoapply.model.Template;
import com.kaddy.autoapply.service.TemplateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<List<Template>> list(Authentication auth) {
        return ResponseEntity.ok(templateService.getTemplatesForUser((String) auth.getPrincipal()));
    }

    @PostMapping
    public ResponseEntity<Template> create(Authentication auth,
                                           @Valid @RequestBody TemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateService.create((String) auth.getPrincipal(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Template> update(Authentication auth,
                                           @PathVariable String id,
                                           @Valid @RequestBody TemplateRequest request) {
        return ResponseEntity.ok(templateService.update((String) auth.getPrincipal(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable String id) {
        templateService.delete((String) auth.getPrincipal(), id);
        return ResponseEntity.noContent().build();
    }
}
