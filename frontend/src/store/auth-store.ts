import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { getTierFeatures } from "@/lib/tier-features";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;

  hasRole: (role: string) => boolean;

  canSeeAllJobs: () => boolean;
  canAutoApply: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      hasRole: (role: string) => get().user?.roles?.includes(role) ?? false,

      canSeeAllJobs: () => {
        const { user } = get();
        if (!user) return false;
        if (user.roles?.includes("ROLE_ADMIN")) return true;
        return getTierFeatures(user.subscriptionTier).maxJobResults > 2;
      },

      canAutoApply: () => {
        const { user } = get();
        if (!user) return false;
        if (user.roles?.includes("ROLE_ADMIN")) return true;
        return getTierFeatures(user.subscriptionTier).autoApply;
      },
    }),
    { name: "kaddy-auth" }
  )
);
