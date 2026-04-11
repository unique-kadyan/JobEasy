package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.MockInterviewSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MockInterviewRepository extends MongoRepository<MockInterviewSession, String> {

    Page<MockInterviewSession> findByUserIdOrderByStartedAtDesc(String userId, Pageable pageable);

    Optional<MockInterviewSession> findByIdAndUserId(String id, String userId);

    long countByUserIdAndStatus(String userId, String status);
}
