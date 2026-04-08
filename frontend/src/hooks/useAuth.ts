import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import type { AuthResponse } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { setAuth, logout: clearAuth, user, isAuthenticated } = useAuthStore();

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    router.push("/dashboard");
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/signup", {
      name,
      email,
      password,
    });
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    router.push("/dashboard");
  };

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return { user, isAuthenticated, login, signup, logout };
}
