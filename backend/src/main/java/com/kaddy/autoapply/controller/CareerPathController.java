package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.response.CareerPathResponse;
import com.kaddy.autoapply.service.CareerPathService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/career-path")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class CareerPathController {

    private final CareerPathService careerPathService;

    public CareerPathController(CareerPathService careerPathService) {
        this.careerPathService = careerPathService;
    }

    @GetMapping("/analyze")
    public ResponseEntity<CareerPathResponse> analyze(Authentication auth) {
        return ResponseEntity.ok(careerPathService.analyze((String) auth.getPrincipal()));
    }
}
