package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.AutoApplyJob;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AutoApplyJobRepository extends MongoRepository<AutoApplyJob, String> {
    List<AutoApplyJob> findByUserIdOrderByQueuedAtDesc(String userId);
    List<AutoApplyJob> findByUserIdAndStatusOrderByQueuedAtDesc(String userId, String status);
}
