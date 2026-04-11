"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth-store";
import { LogOut, User, Search, Crown } from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import CommandPalette from "@/components/ui/CommandPalette";
import Link from "next/link";
import type { ServerStatus } from "@/hooks/useKeepAlive";
import { cn } from "@/lib/utils";

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  FREE: {
    label: "Free",
    className: "border border-gray-400 dark:border-[#30363d] text-gray-500 dark:text-[#8b949e] bg-gray-100 dark:bg-[#21262d]",
  },
  GOLD: {
    label: "Gold",
    className: "border border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-yellow-900/20",
  },
  PLATINUM: {
    label: "Platinum",
    className: "border border-indigo-400 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20",
  },
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
      <header className="fixed top-0 left-64 right-0 z-30 flex h-16 items-center justify-between border-b-2 border-black dark:border-[#30363d] bg-[#f5f2ea]/95 dark:bg-[#0d1117]/95 backdrop-blur-sm px-6 gap-4">
        {/* Search trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-gray-400 dark:text-[#8b949e] bg-white dark:bg-[#161b22] hover:border-indigo-600 dark:hover:border-indigo-500 border-2 border-black dark:border-[#30363d] rounded-[4px] px-3 py-1.5 transition-colors min-w-[200px]"
          style={{ boxShadow: "2px 2px 0 #000" }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] font-black font-mono bg-gray-100 dark:bg-[#21262d] border border-black dark:border-[#30363d] rounded-[2px] px-1.5 py-0.5 text-black dark:text-white">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-3">
          {tier !== "PLATINUM" && (
            <Link href="/pricing">
              <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-black">
                <Crown className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            </Link>
          )}

          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[3px] ${tierBadge.className}`}
          >
            {tierBadge.label}
          </span>

          <ServerStatusDot status={serverStatus} />

          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[3px] border-2 border-black dark:border-[#30363d] bg-indigo-600 text-white font-black text-xs"
              style={{ boxShadow: "2px 2px 0 #000" }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? <User className="h-4 w-4" />}
            </div>
            <span className="text-sm font-bold text-black dark:text-white hidden sm:block">{user?.name}</span>
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
      <span className={cn("h-2.5 w-2.5 rounded-[2px]", cfg.color)} />
      {cfg.pulse && (
        <span
          className={cn(
            "absolute inline-flex h-2.5 w-2.5 rounded-[2px] opacity-75 animate-ping",
            cfg.color
          )}
        />
      )}
    </div>
  );
}
