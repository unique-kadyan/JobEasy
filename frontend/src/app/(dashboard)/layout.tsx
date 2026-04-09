"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

/**
 * Dashboard layout — client-side auth guard (secondary to middleware.ts).
 *
 * Two layers of protection:
 * 1. `middleware.ts` (Edge) — redirects unauthenticated requests server-side
 *    before the page is rendered.  Fastest path; no flash of content.
 * 2. This layout — handles the Zustand store hydration gap on first paint.
 *    Zustand's `persist` middleware rehydrates from localStorage after the
 *    initial render, so there's a brief window where `isAuthenticated` is
 *    false even for valid sessions.  We show a loading state instead of
 *    flashing the login redirect.
 *
 * Email verification banner — shown (non-blocking) when the user hasn't
 * verified their email address yet.  They can still use the app.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Track whether Zustand has finished hydrating from localStorage.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persist rehydrates synchronously when the store subscribes,
    // but useEffect runs after paint.  One tick is enough.
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  // While hydrating from localStorage, render nothing to avoid a flash.
  if (!hydrated) return null;

  // After hydration, if not authenticated the redirect is in-flight.
  if (!isAuthenticated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Email verification banner (OWASP A07 — confirm user identity) */}
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

        <Sidebar />
        <Topbar />
        <main className="ml-64 pt-16 p-6">{children}</main>
      </div>
    </QueryClientProvider>
  );
}
