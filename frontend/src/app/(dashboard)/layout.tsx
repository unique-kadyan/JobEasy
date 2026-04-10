"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import { useKeepAlive } from "@/hooks/useKeepAlive";
import type { ServerStatus } from "@/hooks/useKeepAlive";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { theme } = useThemeStore();
  const [hydrated, setHydrated] = useState(false);
  const serverStatus = useKeepAlive();

  useEffect(() => {
    setHydrated(true);
  }, []);

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
      <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-[#0d1117] dark:bg-[#0d1117] bg-gray-50`}>
        {user && !user.emailVerified && (
          <div className="fixed top-12 left-0 right-0 z-30 bg-amber-900/80 border-b border-amber-700 px-4 py-2 text-center text-sm text-amber-200">
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
              className="underline font-medium hover:text-amber-100"
            >
              Resend verification email
            </button>
          </div>
        )}

        <WarmUpBanner status={serverStatus} />
        <Navbar serverStatus={serverStatus} />
        <main className="pt-12 min-h-screen">
          <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
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
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-indigo-700 px-4 py-2 text-sm text-white shadow-md">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      Server is starting up — this takes 30–50 seconds on first load. Page will refresh automatically.
    </div>
  );
}
