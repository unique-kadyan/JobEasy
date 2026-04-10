package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.Resume;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends MongoRepository<Resume, String> {
    List<Resume> findByUserIdOrderByCreatedAtDesc(String userId);
    Page<Resume> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    Optional<Resume> findByUserIdAndIsPrimaryTrue(String userId);
}
