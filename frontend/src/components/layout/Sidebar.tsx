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
  TrendingUp,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/jobs",          label: "Find Jobs",      icon: Search },
  { href: "/applications",  label: "Applications",   icon: Send },
  { href: "/resumes",       label: "Resumes",        icon: FileText },
  { href: "/smart-resume",  label: "Smart Resume",   icon: Sparkles },
  { href: "/cover-letters", label: "Cover Letters",  icon: Mail },
  { href: "/career-path",     label: "Career Path",    icon: TrendingUp },
  { href: "/interview-prep",  label: "Interview Prep", icon: MessageSquare },
  { href: "/profile",         label: "Profile",        icon: User },
  { href: "/settings",      label: "Settings",       icon: Settings },
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r-2 border-black bg-[#f5f2ea] flex flex-col">
      <div className="flex h-14 items-center gap-2 border-b-2 border-black px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-indigo-600 border-2 border-black" style={{ boxShadow: "2px 2px 0 #000" }}>
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-black text-black tracking-tight">Rolevo</span>
        <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-[2px] font-bold ml-auto uppercase tracking-widest">
          AI
        </span>
      </div>

      <nav className="mt-3 px-3 space-y-0.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[3px] px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-100",
                isActive
                  ? "bg-indigo-600 text-white border-2 border-black"
                  : "text-gray-700 hover:bg-white hover:text-black border-2 border-transparent hover:border-black"
              )}
              style={isActive ? { boxShadow: "2px 2px 0 #000" } : undefined}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-2 border-t-2 border-black pt-3">
        <div className="rounded-[4px] border-2 border-black p-3 bg-white" style={{ boxShadow: "3px 3px 0 #000" }}>
          <div className="flex items-center gap-2 mb-2">
            <Crown className={cn("h-4 w-4", cfg.iconColor)} />
            <span className="text-xs font-black text-black uppercase tracking-wide">{cfg.label}</span>
          </div>
          {tier !== "PLATINUM" && cfg.upgradeHint && (
            <>
              <p className="text-xs text-gray-600 mb-2 font-medium">{cfg.upgradeHint}</p>
              <Link
                href="/pricing"
                className="block w-full text-center text-xs font-black text-white py-1.5 rounded-[3px] bg-indigo-600 border-2 border-black nb-lift"
                style={{ boxShadow: "2px 2px 0 #000" }}
              >
                {cfg.upgradeLabel}
              </Link>
            </>
          )}
          {tier === "PLATINUM" && (
            <p className="text-xs font-bold text-gray-700">You have full access!</p>
          )}
        </div>

        <Link
          href="/pricing"
          className={cn(
            "flex items-center gap-3 rounded-[3px] px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-100 border-2",
            pathname === "/pricing"
              ? "bg-indigo-600 text-white border-black"
              : "text-gray-700 border-transparent hover:bg-white hover:text-black hover:border-black"
          )}
          style={pathname === "/pricing" ? { boxShadow: "2px 2px 0 #000" } : undefined}
        >
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          Pricing
        </Link>
      </div>
    </aside>
  );
}
