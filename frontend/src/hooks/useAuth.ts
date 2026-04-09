import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import api, { setSessionCookie, clearSessionCookie } from "@/lib/api";
import type { AuthResponse } from "@/types";

/**
 * Authentication hook — wraps the auth store with navigation side-effects
 * and backend API calls.
 *
 * Security notes:
 * - login/signup: sets a `kaddy-session` presence cookie so Next.js middleware
 *   can enforce server-side route protection without touching the actual JWT.
 * - logout: calls POST /api/auth/logout to blacklist the access token on the
 *   backend (Redis-backed TokenBlacklistService) — OWASP A07:2021.  Local
 *   state is cleared even if the backend call fails so the UI is never stuck.
 * - hasRole / isAdmin: reads roles from the User object returned by the backend
 *   (roles claim in JWT, echoed in UserResponse).  Used to gate admin UI.
 */
export function useAuth() {
  const router = useRouter();
  const { setAuth, logout: clearAuth, user, isAuthenticated, hasRole } =
    useAuthStore();

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    setSessionCookie();
    router.push("/dashboard");
  };

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    const res = await api.post<AuthResponse>("/auth/signup", {
      name,
      email,
      password,
    });
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    setSessionCookie();
    router.push("/dashboard");
  };

  /**
   * Logs the user out:
   * 1. Calls POST /api/auth/logout to blacklist the access token (OWASP A07).
   * 2. Clears the Zustand store and session cookie regardless of backend result.
   * 3. Redirects to /login.
   */
  const logout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Backend blacklist failure is non-fatal — local state is still cleared.
      // The token will expire naturally via its TTL.
    } finally {
      clearAuth();
      clearSessionCookie();
      router.push("/login");
    }
  };

  /**
   * Returns true if the authenticated user has the given Spring Security role.
   * Roles follow the ROLE_ prefix convention: "ROLE_USER", "ROLE_ADMIN".
   */
  const userHasRole = (role: string): boolean => hasRole(role);

  /** Convenience shorthand for admin role check. */
  const isAdmin = (): boolean => hasRole("ROLE_ADMIN");

  return { user, isAuthenticated, login, signup, logout, hasRole: userHasRole, isAdmin };
}
