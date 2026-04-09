package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.model.Resume;
import com.kaddy.autoapply.service.ResumeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/resumes")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Resume> upload(Authentication auth,
                                         @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resumeService.upload((String) auth.getPrincipal(), file));
    }

    @GetMapping
    public ResponseEntity<List<Resume>> list(Authentication auth) {
        return ResponseEntity.ok(resumeService.getUserResumes((String) auth.getPrincipal()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resume> get(Authentication auth, @PathVariable String id) {
        return ResponseEntity.ok(resumeService.getResume((String) auth.getPrincipal(), id));
    }

    @PutMapping("/{id}/primary")
    public ResponseEntity<Void> setPrimary(Authentication auth, @PathVariable String id) {
        resumeService.setPrimary((String) auth.getPrincipal(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable String id) {
        resumeService.delete((String) auth.getPrincipal(), id);
        return ResponseEntity.noContent().build();
    }
}
