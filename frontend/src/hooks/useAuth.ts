import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import api, { setSessionCookie, clearSessionCookie } from "@/lib/api";
import type { AuthResponse } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { setAuth, logout: clearAuth, setWelcomeScreen, user, isAuthenticated, hasRole } =
    useAuthStore();

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    setSessionCookie();
    setWelcomeScreen({
      show: true,
      type: "login",
      userName: res.data.user.name?.split(" ")[0] ?? "there",
    });
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
    setWelcomeScreen({
      show: true,
      type: "signup",
      userName: res.data.user.name?.split(" ")[0] ?? name.split(" ")[0],
    });
    router.push("/dashboard");
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch {
    } finally {
      clearAuth();
      clearSessionCookie();
      router.push("/login");
    }
  };

  const userHasRole = (role: string): boolean => hasRole(role);

  const isAdmin = (): boolean => hasRole("ROLE_ADMIN");

  return { user, isAuthenticated, login, signup, logout, hasRole: userHasRole, isAdmin };
}
