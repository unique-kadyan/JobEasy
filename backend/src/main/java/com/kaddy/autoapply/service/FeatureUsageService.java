package com.kaddy.autoapply.service;

import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.model.FeatureUsageRecord;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.enums.FeatureType;
import com.kaddy.autoapply.model.enums.SubscriptionTier;
import com.kaddy.autoapply.repository.FeatureUsageRepository;
import com.kaddy.autoapply.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FeatureUsageService {

    private static final Logger log = LoggerFactory.getLogger(FeatureUsageService.class);

    /** Refund window: 7 days from subscription activation */
    private static final int REFUND_WINDOW_DAYS = 7;

    private final FeatureUsageRepository featureUsageRepository;
    private final UserRepository         userRepository;

    public FeatureUsageService(FeatureUsageRepository featureUsageRepository,
                               UserRepository userRepository) {
        this.featureUsageRepository = featureUsageRepository;
        this.userRepository         = userRepository;
    }

    // -----------------------------------------------------------------------
    // Usage recording
    // -----------------------------------------------------------------------

    /**
     * Records a single feature usage event for audit and refund calculation.
     * Call this after a successful feature operation (fire-and-forget ok).
     */
    public void record(String userId, FeatureType featureType, String referenceId) {
        try {
            featureUsageRepository.save(new FeatureUsageRecord(userId, featureType, referenceId));
            log.debug("Feature usage recorded: user={} feature={} ref={}", userId, featureType, referenceId);
        } catch (Exception e) {
            log.warn("Failed to record feature usage for user={} feature={}: {}", userId, featureType, e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Refund eligibility
    // -----------------------------------------------------------------------

    public record RefundEligibility(
            boolean eligible,
            String reason,
            long subscriptionAmountPaise,
            long usedValuePaise,
            long refundAmountPaise,
            LocalDateTime subscriptionStartDate,
            LocalDateTime refundWindowEndsAt,
            List<UsageSummary> usageSummary) {}

    public record UsageSummary(
            String featureType,
            int count,
            long unitCostPaise,
            long totalCostPaise) {}

    /**
     * Calculates refund eligibility for the authenticated user.
     * Refund = subscriptionAmount - sum(featureUsageCosts), minimum 0.
     * Eligible only if within 7 days of subscription activation.
     */
    public RefundEligibility getRefundEligibility(String userId) {
        User user = findUser(userId);

        if (user.getSubscriptionTier() == SubscriptionTier.FREE) {
            return new RefundEligibility(false, "No active paid subscription.",
                    0, 0, 0, null, null, List.of());
        }

        LocalDateTime startDate = user.getSubscriptionStartDate();
        if (startDate == null) {
            return new RefundEligibility(false, "Subscription activation date not recorded.",
                    0, 0, 0, null, null, List.of());
        }

        LocalDateTime windowEnd = startDate.plusDays(REFUND_WINDOW_DAYS);
        LocalDateTime now = LocalDateTime.now();

        if (now.isAfter(windowEnd)) {
            return new RefundEligibility(false,
                    "Refund window of " + REFUND_WINDOW_DAYS + " days has expired.",
                    user.getSubscriptionAmountPaise(), 0, 0, startDate, windowEnd, List.of());
        }

        // Calculate usage costs within the subscription window
        List<FeatureUsageRecord> records = featureUsageRepository
                .findByUserIdAndUsedAtAfter(userId, startDate);

        Map<FeatureType, List<FeatureUsageRecord>> grouped = records.stream()
                .collect(Collectors.groupingBy(FeatureUsageRecord::getFeatureType));

        List<UsageSummary> summaries = grouped.entrySet().stream()
                .map(e -> {
                    FeatureType ft = e.getKey();
                    List<FeatureUsageRecord> uses = e.getValue();
                    long unitCost = ft.getCostPaise();
                    long total    = uses.stream().mapToLong(FeatureUsageRecord::getCostPaise).sum();
                    return new UsageSummary(ft.name(), uses.size(), unitCost, total);
                })
                .sorted(java.util.Comparator.comparing(UsageSummary::featureType))
                .toList();

        long usedValuePaise = summaries.stream().mapToLong(UsageSummary::totalCostPaise).sum();
        long subAmount      = user.getSubscriptionAmountPaise();
        long refundAmount   = Math.max(0, subAmount - usedValuePaise);

        boolean eligible = refundAmount > 0;
        String reason = eligible
                ? "Eligible for ₹" + (refundAmount / 100) + " refund."
                : "All subscription value has been consumed through feature usage.";

        return new RefundEligibility(eligible, reason, subAmount, usedValuePaise,
                refundAmount, startDate, windowEnd, summaries);
    }

    /**
     * Processes a refund request: validates eligibility, downgrades to FREE,
     * returns the approved refund amount in paise.
     */
    public long requestRefund(String userId) {
        RefundEligibility eligibility = getRefundEligibility(userId);

        if (!eligibility.eligible()) {
            throw new BadRequestException(eligibility.reason());
        }

        User user = findUser(userId);
        user.setSubscriptionTier(SubscriptionTier.FREE);
        user.setSubscriptionStartDate(null);
        user.setSubscriptionAmountPaise(0);
        user.setSubscriptionBillingCycle(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Refund approved: user={} amount={}p", userId, eligibility.refundAmountPaise());
        return eligibility.refundAmountPaise();
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found."));
    }

}
