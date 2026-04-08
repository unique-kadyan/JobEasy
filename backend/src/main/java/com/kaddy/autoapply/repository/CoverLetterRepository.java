package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.CoverLetter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CoverLetterRepository extends MongoRepository<CoverLetter, String> {
    Page<CoverLetter> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
