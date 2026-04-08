package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.Application;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ApplicationRepository extends MongoRepository<Application, String> {
    Page<Application> findByUserIdOrderByAppliedAtDesc(String userId, Pageable pageable);
    Page<Application> findByUserIdAndStatusOrderByAppliedAtDesc(String userId, ApplicationStatus status, Pageable pageable);
    boolean existsByUserIdAndJobId(String userId, String jobId);
    long countByUserId(String userId);
    long countByUserIdAndStatus(String userId, ApplicationStatus status);
}
