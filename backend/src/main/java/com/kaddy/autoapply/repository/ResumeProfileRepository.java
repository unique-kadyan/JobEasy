package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.ResumeProfile;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ResumeProfileRepository extends MongoRepository<ResumeProfile, String> {
    Optional<ResumeProfile> findByUserId(String userId);
    void deleteByUserId(String userId);
}
