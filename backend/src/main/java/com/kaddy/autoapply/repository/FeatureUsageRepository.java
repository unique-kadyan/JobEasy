package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.FeatureUsageRecord;
import com.kaddy.autoapply.model.enums.FeatureType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FeatureUsageRepository extends MongoRepository<FeatureUsageRecord, String> {

    List<FeatureUsageRecord> findByUserIdAndUsedAtAfter(String userId, LocalDateTime after);

    List<FeatureUsageRecord> findByUserIdAndFeatureTypeAndUsedAtAfter(
            String userId, FeatureType featureType, LocalDateTime after);

    long countByUserIdAndFeatureTypeAndUsedAtAfter(
            String userId, FeatureType featureType, LocalDateTime after);
}
