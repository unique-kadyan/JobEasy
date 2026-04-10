"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth-store";
import { LogOut, User, Search, Crown } from "lucide-react";
import Button from "@/components/ui/Button";
import CommandPalette from "@/components/ui/CommandPalette";
import Link from "next/link";
import type { ServerStatus } from "@/hooks/useKeepAlive";
import { cn } from "@/lib/utils";

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  FREE: { label: "Free", className: "bg-gray-100 text-gray-500" },
  JOBS: { label: "All Jobs", className: "bg-indigo-100 text-indigo-700" },
  AUTO_APPLY: { label: "Auto Apply", className: "bg-purple-100 text-purple-700" },
};

const STATUS_DOT: Record<ServerStatus, { color: string; pulse: boolean; label: string }> = {
  up:         { color: "bg-green-500",  pulse: false, label: "Server online" },
  down:       { color: "bg-red-500",    pulse: true,  label: "Server offline — reconnecting…" },
  connecting: { color: "bg-yellow-400", pulse: true,  label: "Connecting to server…" },
};

export default function Topbar({ serverStatus = "connecting" }: { serverStatus?: ServerStatus }) {
  const { user, logout } = useAuth();
  const { user: storeUser } = useAuthStore();
  const [cmdOpen, setCmdOpen] = useState(false);

  const tier = storeUser?.subscriptionTier ?? "FREE";
  const tierBadge = TIER_BADGE[tier] ?? TIER_BADGE.FREE;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-64 right-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm px-6 gap-4">
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors min-w-[200px]"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-xs font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>

        <div className="flex items-center gap-3">
          {tier !== "AUTO_APPLY" && (
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <Crown className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            </Link>
          )}

          <span className={`text-xs font-medium px-2 py-1 rounded-full ${tierBadge.className}`}>
            {tierBadge.label}
          </span>

          <ServerStatusDot status={serverStatus} />

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-xs">
              {user?.name?.charAt(0)?.toUpperCase() ?? <User className="h-4 w-4" />}
            </div>
            <span className="font-medium text-gray-900 hidden sm:block">{user?.name}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}

function ServerStatusDot({ status }: { status: ServerStatus }) {
  const cfg = STATUS_DOT[status];
  return (
    <div className="relative flex items-center" title={cfg.label}>
      <span className={cn("h-2.5 w-2.5 rounded-full", cfg.color)} />
      {cfg.pulse && (
        <span
          className={cn(
            "absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping",
            cfg.color
          )}
        />
      )}
    </div>
  );
}
