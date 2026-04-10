"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
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
  const [hydrated, setHydrated] = useState(false);
  const serverStatus = useKeepAlive();

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push("/login");
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {user && !user.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
            Please verify your email address to unlock all features.{" "}
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
              className="underline font-medium hover:text-amber-900"
            >
              Resend verification email
            </button>
          </div>
        )}

        <WarmUpBanner status={serverStatus} />
        <Sidebar />
        <Topbar serverStatus={serverStatus} />
        <main className="ml-64 pt-16 p-6">{children}</main>
      </div>
    </QueryClientProvider>
  );
}

// Shows only after 4 seconds of non-"up" status — invisible on fast connections,
// informative during a cold start (~50 s). Dismisses automatically when the
// backend comes online.
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
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [status]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-indigo-600 px-4 py-2 text-sm text-white shadow-md">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      Server is starting up — this takes about 30–50 seconds on first load. The page will refresh automatically.
    </div>
  );
}
