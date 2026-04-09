import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

/**
 * Central Axios instance for all API calls.
 *
 * Security measures applied here (OWASP alignment):
 *
 * - `Authorization: Bearer <token>` — JWT auth on every request (A07).
 * - `X-Requested-With: XMLHttpRequest` — CSRF mitigation: browsers won't send
 *   this header for cross-origin form submissions or simple requests, so the
 *   backend can optionally treat its absence as suspicious (A05).
 * - 30-second timeout — prevents slow-read / DoS via hung connections (A04).
 * - 401 → automatic token refresh + retry (A07).
 * - 401 on failed refresh → clear local session and redirect to /login (A07).
 * - 403 → role/permission denial; redirect to dashboard to avoid info leak (A01).
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    // Marks every request as an XHR — helps distinguish AJAX calls from
    // browser-initiated cross-origin requests (CSRF defence-in-depth).
    "X-Requested-With": "XMLHttpRequest",
  },
});

// ── Request interceptor ────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // 401: access token expired → attempt silent refresh, then retry once.
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const res = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken },
            { headers: { "X-Requested-With": "XMLHttpRequest" } }
          );
          const { accessToken, refreshToken: newRefresh } = res.data;
          useAuthStore.getState().setTokens(accessToken, newRefresh);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          // Refresh token is invalid/expired — force full re-login.
          useAuthStore.getState().logout();
          clearSessionCookie();
          if (typeof window !== "undefined") window.location.href = "/login";
        }
      } else {
        useAuthStore.getState().logout();
        clearSessionCookie();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    }

    // 403: authenticated but insufficient role/permissions.
    // Redirect silently to avoid leaking which admin-only routes exist (A01).
    if (error.response?.status === 403) {
      if (typeof window !== "undefined") window.location.href = "/dashboard";
    }

    return Promise.reject(error);
  }
);

// ── Session cookie helpers ─────────────────────────────────────────────────
//
// The `kaddy-session` cookie is a presence indicator only — it contains no
// token data.  Next.js middleware reads it to enforce server-side route
// protection without needing access to the actual JWT (which lives in
// localStorage via Zustand).
//
// Security properties:
//   SameSite=Strict  — cookie is never sent with cross-site requests (CSRF).
//   path=/           — cookie is available across all routes.
//   No httpOnly      — must be writable by client JS (trade-off: readable by
//                      XSS, but contains no sensitive data).
//   max-age=604800   — 7 days, matching the refresh token expiry.

/** Sets the session indicator cookie after a successful login/signup. */
export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  document.cookie = `kaddy-session=1; path=/; max-age=${maxAge}; SameSite=Strict`;
}

/** Clears the session indicator cookie on logout or token expiry. */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie =
    "kaddy-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
}

export default api;
