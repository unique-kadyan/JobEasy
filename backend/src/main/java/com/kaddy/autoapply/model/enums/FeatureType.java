package com.kaddy.autoapply.model.enums;

/**
 * Billable features tracked for usage-based refund calculation.
 * costPaise = per-use deduction from subscription amount when computing refund eligibility.
 */
public enum FeatureType {
    COVER_LETTER_GENERATED(1500),    // ₹15
    SMART_RESUME_GENERATED(3000),    // ₹30
    CAREER_PATH_ANALYZED(5000),      // ₹50
    AUTO_APPLY_SUBMITTED(800),       // ₹8
    MOCK_INTERVIEW_SESSION(2500),    // ₹25
    RESUME_TRANSLATED(2000),         // ₹20
    RESUME_OPTIMIZED(2000);          // ₹20

    private final long costPaise;

    FeatureType(long costPaise) {
        this.costPaise = costPaise;
    }

    public long getCostPaise() {
        return costPaise;
    }
}
