import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";
import { getTierFeatures } from "@/lib/tier-features";

export const REMEMBER_ME_KEY = "kaddy-remember-me";

// ---------------------------------------------------------------------------
// Dynamic storage — reads the "remember me" flag on EVERY getItem/setItem so
// the correct backing store is used even if the flag changes after the module
// is first imported (e.g. the user just logged in and set the flag).
// ---------------------------------------------------------------------------
const dynamicStorage = {
  getItem(name: string): string | null {
    if (typeof window === "undefined") return null;
    const useLocal = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    return (useLocal ? localStorage : sessionStorage).getItem(name);
  },
  setItem(name: string, value: string): void {
    if (typeof window === "undefined") return;
    const useLocal = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    (useLocal ? localStorage : sessionStorage).setItem(name, value);
  },
  removeItem(name: string): void {
    // Clear from both so there's never stale data regardless of which storage
    // was active during this session.
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export interface WelcomeScreen {
  show: boolean;
  type: "login" | "signup";
  userName: string;
}

export interface FarewellScreen {
  show: boolean;
  userName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  welcomeScreen: WelcomeScreen | null;
  farewellScreen: FarewellScreen | null;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setWelcomeScreen: (screen: WelcomeScreen | null) => void;
  setFarewellScreen: (screen: FarewellScreen | null) => void;

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
      welcomeScreen: null,
      farewellScreen: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      logout: () => {
        // Remove the remember-me preference so next login defaults to session
        if (typeof window !== "undefined") {
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          welcomeScreen: null,
          farewellScreen: null,
        });
      },

      setWelcomeScreen: (screen) => set({ welcomeScreen: screen }),
      setFarewellScreen: (screen) => set({ farewellScreen: screen }),

      hasRole: (role: string) => get().user?.roles?.includes(role) ?? false,

      canSeeAllJobs: () => {
        const { user } = get();
        if (!user) return false;
        if (user.roles?.includes("ROLE_ADMIN")) return true;
        return getTierFeatures(user.subscriptionTier).maxJobResults > 15;
      },

      canAutoApply: () => {
        const { user } = get();
        if (!user) return false;
        if (user.roles?.includes("ROLE_ADMIN")) return true;
        return getTierFeatures(user.subscriptionTier).autoApply;
      },
    }),
    {
      name: "kaddy-auth",
      storage: createJSONStorage(() => dynamicStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
