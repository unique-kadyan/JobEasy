import { useAuthStore } from "@/store/auth-store";
import { getTierFeatures, TierCapabilities } from "@/lib/tier-features";

export function useFeatures(): TierCapabilities {
  const user = useAuthStore((s) => s.user);
  return getTierFeatures(user?.subscriptionTier);
}
