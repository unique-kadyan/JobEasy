package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final UserRepository userRepository;

    public PublicController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Returns safe public fields only — no email, phone, or private data. */
    @GetMapping("/profile/{userId}")
    public ResponseEntity<Map<String, Object>> getPublicProfile(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));

        Map<String, Object> pub = new java.util.LinkedHashMap<>();
        pub.put("id",             user.getId());
        pub.put("name",           user.getName());
        pub.put("title",          user.getTitle());
        pub.put("location",       user.getLocation());
        pub.put("summary",        user.getSummary());
        pub.put("experienceYears",user.getExperienceYears());
        pub.put("targetRoles",    user.getTargetRoles() != null ? user.getTargetRoles() : List.of());
        pub.put("skills",         user.getSkills() != null ? user.getSkills() : Map.of());
        pub.put("avatarUrl",      user.getAvatarUrl());
        pub.put("linkedinUrl",    user.getLinkedinUrl());
        pub.put("githubUrl",      user.getGithubUrl());
        pub.put("portfolioUrl",   user.getPortfolioUrl());

        return ResponseEntity.ok(pub);
    }
}
