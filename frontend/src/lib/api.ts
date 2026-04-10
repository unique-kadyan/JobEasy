import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

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

    if (error.response?.status === 403) {
      if (typeof window !== "undefined") window.location.href = "/dashboard";
    }

    return Promise.reject(error);
  }
);

export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `kaddy-session=1; path=/; max-age=${maxAge}; SameSite=Strict`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie =
    "kaddy-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
}

export default api;
