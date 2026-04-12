package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.Application;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ApplicationRepository extends MongoRepository<Application, String> {

    // Applications page — never surface DISMISSED records
    Page<Application> findByUserIdAndStatusNotOrderByAppliedAtDesc(
            String userId, ApplicationStatus excludeStatus, Pageable pageable);

    Page<Application> findByUserIdAndStatusOrderByAppliedAtDesc(
            String userId, ApplicationStatus status, Pageable pageable);

    boolean existsByUserIdAndJobId(String userId, String jobId);

    long countByUserId(String userId);

    long countByUserIdAndStatus(String userId, ApplicationStatus status);

    // Lightweight projection used by job-search to exclude already-interacted jobs.
    // Only jobId is fetched — all other fields are null/default.
    @Query(value = "{ 'userId': ?0 }", fields = "{ 'jobId': 1 }")
    List<Application> findInteractedByUserId(String userId);
}
