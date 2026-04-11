package com.kaddy.autoapply.model;

import com.kaddy.autoapply.model.enums.FeatureType;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Records each individual feature use per user.
 * Used to calculate usage-based refund deductions within the 7-day window.
 */
@Document(collection = "feature_usage_records")
@CompoundIndex(name = "user_feature_period_idx", def = "{'userId': 1, 'featureType': 1, 'usedAt': -1}")
public class FeatureUsageRecord {

    @Id
    private String id;

    @Indexed
    private String userId;

    private FeatureType featureType;

    private String referenceId;   // coverLetterId / resumeId / sessionId etc.

    private long costPaise;       // snapshot of cost at time of use

    @Indexed
    private LocalDateTime usedAt;

    public FeatureUsageRecord() {}

    public FeatureUsageRecord(String userId, FeatureType featureType, String referenceId) {
        this.userId       = userId;
        this.featureType  = featureType;
        this.referenceId  = referenceId;
        this.costPaise    = featureType.getCostPaise();
        this.usedAt       = LocalDateTime.now();
    }

    public String getId()                { return id; }
    public String getUserId()            { return userId; }
    public FeatureType getFeatureType()  { return featureType; }
    public String getReferenceId()       { return referenceId; }
    public long getCostPaise()           { return costPaise; }
    public LocalDateTime getUsedAt()     { return usedAt; }

    public void setId(String id)                        { this.id = id; }
    public void setUserId(String userId)                { this.userId = userId; }
    public void setFeatureType(FeatureType featureType) { this.featureType = featureType; }
    public void setReferenceId(String referenceId)      { this.referenceId = referenceId; }
    public void setCostPaise(long costPaise)            { this.costPaise = costPaise; }
    public void setUsedAt(LocalDateTime usedAt)         { this.usedAt = usedAt; }
}
