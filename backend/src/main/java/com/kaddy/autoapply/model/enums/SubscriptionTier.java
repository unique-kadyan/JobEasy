package com.kaddy.autoapply.model.enums;

/**
 * Subscription tiers for the Kaddy platform.
 *
 * FREE       — default; can search jobs but only sees 2 results per query.
 * JOBS       — paid; sees all job results, no auto-apply.
 * AUTO_APPLY — paid; sees all jobs + multi-select one-click auto-apply.
 */
public enum SubscriptionTier {
    FREE,
    JOBS,
    AUTO_APPLY
}
