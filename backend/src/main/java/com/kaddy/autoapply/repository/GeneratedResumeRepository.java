package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.GeneratedResume;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface GeneratedResumeRepository extends MongoRepository<GeneratedResume, String> {
    Optional<GeneratedResume> findTopByUserIdOrderByGeneratedAtDesc(String userId);
    List<GeneratedResume> findByUserIdOrderByGeneratedAtDesc(String userId);
}
