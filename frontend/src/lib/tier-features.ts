export type SubscriptionTier = "FREE" | "GOLD" | "PLATINUM";

export interface TierCapabilities {
  maxJobResults: number;
  autoApply: boolean;
  scheduledSearch: boolean;
  smartResume: boolean;
  priorityScoring: boolean;
  coverLetterAi: boolean;
}

const TIER_CAPS: Record<SubscriptionTier, TierCapabilities> = {
  FREE: {
    maxJobResults: 2,
    autoApply: false,
    scheduledSearch: false,
    smartResume: false,
    priorityScoring: false,
    coverLetterAi: true,
  },
  GOLD: {
    maxJobResults: 10,
    autoApply: false,
    scheduledSearch: false,
    smartResume: true,
    priorityScoring: true,
    coverLetterAi: true,
  },
  PLATINUM: {
    maxJobResults: Number.MAX_SAFE_INTEGER,
    autoApply: true,
    scheduledSearch: true,
    smartResume: true,
    priorityScoring: true,
    coverLetterAi: true,
  },
};

export function getTierFeatures(
  tier?: SubscriptionTier | string | null
): TierCapabilities {
  return TIER_CAPS[(tier as SubscriptionTier) ?? "FREE"] ?? TIER_CAPS.FREE;
}
