export type SubscriptionTier = "FREE" | "GOLD" | "PLATINUM";

export interface TierCapabilities {
  maxJobResults: number;
  autoApply: boolean;
  scheduledSearch: boolean;
  smartResume: boolean;
  priorityScoring: boolean;
  coverLetterAi: boolean;
  maxCoverLettersPerDay: number;
  maxResumesUploaded: number;
  careerPath: boolean;
  mockInterview: boolean;
  resumeTranslator: boolean;
  resumeOptimizer: boolean;
  dataExport: boolean;
}

const TIER_CAPS: Record<SubscriptionTier, TierCapabilities> = {
  FREE: {
    maxJobResults: 2,
    autoApply: false,
    scheduledSearch: false,
    smartResume: false,
    priorityScoring: false,
    coverLetterAi: true,
    maxCoverLettersPerDay: 3,
    maxResumesUploaded: 2,
    careerPath: false,
    mockInterview: false,
    resumeTranslator: false,
    resumeOptimizer: false,
    dataExport: false,
  },
  GOLD: {
    maxJobResults: 10,
    autoApply: false,
    scheduledSearch: false,
    smartResume: true,
    priorityScoring: true,
    coverLetterAi: true,
    maxCoverLettersPerDay: 25,
    maxResumesUploaded: 10,
    careerPath: true,
    mockInterview: true,
    resumeTranslator: true,
    resumeOptimizer: true,
    dataExport: false,
  },
  PLATINUM: {
    maxJobResults: Number.MAX_SAFE_INTEGER,
    autoApply: true,
    scheduledSearch: true,
    smartResume: true,
    priorityScoring: true,
    coverLetterAi: true,
    maxCoverLettersPerDay: Number.MAX_SAFE_INTEGER,
    maxResumesUploaded: Number.MAX_SAFE_INTEGER,
    careerPath: true,
    mockInterview: true,
    resumeTranslator: true,
    resumeOptimizer: true,
    dataExport: true,
  },
};

export function getTierFeatures(
  tier?: SubscriptionTier | string | null
): TierCapabilities {
  return TIER_CAPS[(tier as SubscriptionTier) ?? "FREE"] ?? TIER_CAPS.FREE;
}
