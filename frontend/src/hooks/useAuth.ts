import { useRouter } from "next/navigation";
import { useAuthStore, REMEMBER_ME_KEY } from "@/store/auth-store";
import api, { setSessionCookie, clearSessionCookie } from "@/lib/api";
import type { AuthResponse } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { setAuth, logout: clearAuth, setWelcomeScreen, setFarewellScreen, user, isAuthenticated, hasRole } =
    useAuthStore();

  const login = async (email: string, password: string, rememberMe = false): Promise<void> => {
    // Set the flag BEFORE calling setAuth so the dynamic storage picks up the
    // correct backing store (localStorage vs sessionStorage) on first write.
    if (typeof window !== "undefined") {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "true" : "false");
    }
    const res = await api.post<AuthResponse>("/auth/login", { email, password, rememberMe });
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    setSessionCookie(rememberMe);
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
    // Signup never enables "remember me" — user can opt in on next login
    if (typeof window !== "undefined") {
      localStorage.setItem(REMEMBER_ME_KEY, "false");
    }
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    setSessionCookie(false);
    setWelcomeScreen({
      show: true,
      type: "signup",
      userName: res.data.user.name?.split(" ")[0] ?? name.split(" ")[0],
    });
    router.push("/dashboard");
  };

  const logout = async (): Promise<void> => {
    // Capture name before clearing auth so the farewell screen can use it
    const firstName = user?.name?.split(" ")[0] ?? "there";
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — proceed with local logout regardless
    }
    // Show the farewell animation; the layout's onComplete handler will
    // call clearAuth() + redirect after the animation finishes.
    setFarewellScreen({ show: true, userName: firstName });
  };

  const userHasRole = (role: string): boolean => hasRole(role);

  const isAdmin = (): boolean => hasRole("ROLE_ADMIN");

  return { user, isAuthenticated, login, signup, logout, hasRole: userHasRole, isAdmin };
}
