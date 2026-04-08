package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.Resume;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends MongoRepository<Resume, String> {
    List<Resume> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Resume> findByUserIdAndIsPrimaryTrue(String userId);
}
