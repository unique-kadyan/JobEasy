package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.ResumeAnalysis;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ResumeAnalysisRepository extends MongoRepository<ResumeAnalysis, String> {
    Optional<ResumeAnalysis> findTopByUserIdOrderByAnalyzedAtDesc(String userId);
}
