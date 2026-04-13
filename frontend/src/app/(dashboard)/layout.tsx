"use client";

import FarewellScreen from "@/components/layout/FarewellScreen";
import Navbar from "@/components/layout/Navbar";
import WelcomeScreen from "@/components/layout/WelcomeScreen";
import type { ServerStatus } from "@/hooks/useKeepAlive";
import { useKeepAlive } from "@/hooks/useKeepAlive";
import { clearSessionCookie } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    isAuthenticated,
    user,
    welcomeScreen,
    setWelcomeScreen,
    farewellScreen,
    setFarewellScreen,
    logout: clearAuth,
  } = useAuthStore();
  const { theme } = useThemeStore();
  const [hydrated, setHydrated] = useState(false);
  const serverStatus = useKeepAlive();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push("/login");
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (hydrated && isAuthenticated && user && user.onboardingCompleted === false) {
      router.replace("/onboarding");
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#0a0a0f]">
        {user && !user.emailVerified && (
          <div className="fixed top-12 right-0 left-0 z-30 border-b border-amber-700 bg-amber-900/80 px-4 py-2 text-center text-sm text-amber-200">
            Please verify your email to unlock all features.{" "}
            <button
              onClick={() =>
                fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/auth/resend-verification`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: user.email }),
                  }
                )
              }
              className="font-medium underline hover:text-amber-100"
            >
              Resend verification email
            </button>
          </div>
        )}

        <WarmUpBanner status={serverStatus} />
        <Navbar serverStatus={serverStatus} />
        <main className="min-h-screen pt-12">
          <div className="mx-auto max-w-[1400px] px-6 py-6">{children}</div>
        </main>
      </div>

      {welcomeScreen?.show && (
        <WelcomeScreen
          type={welcomeScreen.type}
          userName={welcomeScreen.userName}
          onComplete={() => setWelcomeScreen(null)}
        />
      )}

      {farewellScreen?.show && (
        <FarewellScreen
          userName={farewellScreen.userName}
          onComplete={() => {
            setFarewellScreen(null);
            clearAuth();
            clearSessionCookie();
            router.push("/login");
          }}
        />
      )}
    </QueryClientProvider>
  );
}

function WarmUpBanner({ status }: { status: ServerStatus }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "up") {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(() => setVisible(true), 4_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-3 bg-indigo-700 px-4 py-2 text-sm text-white shadow-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      Server is starting up — this takes 30–50 seconds on first load. Page will refresh
      automatically.
    </div>
  );
}
