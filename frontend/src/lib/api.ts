import axios from "axios";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/errors";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // For FormData (file uploads), suppress the default application/json Content-Type so the
  // browser can set multipart/form-data with the correct boundary automatically.
  // In Axios 1.x, setting a header to `false` removes it from the outgoing request.
  if (config.data instanceof FormData) {
    (config.headers as Record<string, unknown>)["Content-Type"] = false;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

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

    const friendlyMessage = getApiErrorMessage(error);
    const friendlyError = new Error(friendlyMessage);
    Object.assign(friendlyError, {
      status: error.response?.status,
      originalError: error,
    });
    return Promise.reject(friendlyError);
  }
);

export function setSessionCookie(rememberMe = false): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  if (rememberMe) {
    // Persist 30 days across browser restarts
    const maxAge = 30 * 24 * 60 * 60;
    document.cookie = `kaddy-session=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  } else {
    // Session cookie — expires automatically when the browser is closed
    document.cookie = `kaddy-session=1; path=/; SameSite=Lax${secure}`;
  }
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `kaddy-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
}

export default api;
