"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  LayoutDashboard,
  Search,
  FileText,
  Send,
  Mail,
  Settings,
  Zap,
  Sparkles,
  User,
  CreditCard,
  Crown,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Find Jobs", icon: Search },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/smart-resume", label: "Smart Resume", icon: Sparkles },
  { href: "/cover-letters", label: "Cover Letters", icon: Mail },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TIER_CONFIG: Record<string, {
  label: string;
  iconColor: string;
  textColor: string;
  gradient: string;
  upgradeBtn?: string;
  upgradeBtnHover?: string;
  upgradeLabel?: string;
  upgradeHint?: string;
}> = {
  FREE: {
    label: "Free Plan",
    iconColor: "text-gray-400",
    textColor: "text-gray-500",
    gradient: "from-gray-50 to-gray-100",
    upgradeBtn: "bg-indigo-600 hover:bg-indigo-700",
    upgradeLabel: "Upgrade Plan",
    upgradeHint: "Upgrade to Gold to unlock up to 10 jobs per search.",
  },
  GOLD: {
    label: "Gold Plan",
    iconColor: "text-yellow-500",
    textColor: "text-yellow-700",
    gradient: "from-yellow-50 to-amber-100",
    upgradeBtn: "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800",
    upgradeLabel: "Go Platinum",
    upgradeHint: "Upgrade to Platinum for auto-apply and scheduled job search.",
  },
  PLATINUM: {
    label: "Platinum Plan",
    iconColor: "text-slate-400",
    textColor: "text-slate-600",
    gradient: "from-slate-100 to-slate-200",
  },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const tier = user?.subscriptionTier ?? "FREE";
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.FREE;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white flex flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">Kaddy</span>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium ml-auto">
          AI
        </span>
      </div>

      <nav className="mt-4 px-3 space-y-0.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-600" : "text-gray-400")} />
              {item.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-2 border-t border-gray-100 pt-3">
        <div className={cn("rounded-xl p-3 bg-gradient-to-br", cfg.gradient)}>
          <div className="flex items-center gap-2 mb-2">
            <Crown className={cn("h-4 w-4", cfg.iconColor)} />
            <span className={cn("text-xs font-semibold", cfg.textColor)}>{cfg.label}</span>
          </div>
          {tier !== "PLATINUM" && cfg.upgradeHint && (
            <>
              <p className="text-xs text-gray-500 mb-2">{cfg.upgradeHint}</p>
              <Link
                href="/pricing"
                className={cn(
                  "block w-full text-center text-xs font-semibold text-white py-1.5 rounded-lg transition-colors",
                  cfg.upgradeBtn
                )}
              >
                {cfg.upgradeLabel}
              </Link>
            </>
          )}
          {tier === "PLATINUM" && (
            <p className={cn("text-xs font-medium", cfg.textColor)}>You have full access!</p>
          )}
        </div>

        <Link
          href="/pricing"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
            pathname === "/pricing"
              ? "bg-indigo-50 text-indigo-700 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <CreditCard className={cn("h-4 w-4 shrink-0", pathname === "/pricing" ? "text-indigo-600" : "text-gray-400")} />
          Pricing
          {pathname === "/pricing" && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
          )}
        </Link>
      </div>
    </aside>
  );
}
