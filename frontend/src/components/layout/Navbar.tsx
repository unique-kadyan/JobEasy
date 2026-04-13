"use client";

import {
  Bell,
  Briefcase,
  ChevronDown,
  CreditCard,
  Crown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  User,
  Zap,
} from "@/components/ui/icons";
import { useAuth } from "@/hooks/useAuth";
import type { ServerStatus } from "@/hooks/useKeepAlive";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    short: "Dashboard",
    icon: LayoutDashboard,
  },
  { href: "/search", label: "Search", short: "Search", icon: Search },
  { href: "/jobs", label: "Jobs", short: "Jobs", icon: Briefcase },
  {
    href: "/applications",
    label: "Applications",
    short: "Applications",
    icon: Send,
  },
  {
    href: "/smart-resume",
    label: "Smart Resume",
    short: "Smart Resume",
    icon: Sparkles,
  },
  {
    href: "/cover-letters",
    label: "Cover Letters",
    short: "Cover Letters",
    icon: Mail,
  },
  {
    href: "/career-path",
    label: "Career Path",
    short: "Career",
    icon: TrendingUp,
  },
  {
    href: "/interview-prep",
    label: "Interview Prep",
    short: "Interview",
    icon: MessageSquare,
  },
  {
    href: "/skill-hub",
    label: "Skill Hub",
    short: "Skills",
    icon: GraduationCap,
  },
];

const TIER_BADGE: Record<string, { label: string; className: string; iconClass: string }> = {
  FREE: {
    label: "Free",
    className: "bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93]",
    iconClass: "text-[#86868b] dark:text-[#8e8e93]",
  },
  GOLD: {
    label: "Gold",
    className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-yellow-400",
    iconClass: "text-amber-500 dark:text-yellow-400",
  },
  PLATINUM: {
    label: "Platinum",
    className: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300",
    iconClass: "text-indigo-500 dark:text-indigo-300",
  },
};

export default function Navbar({ serverStatus = "connecting" }: { serverStatus?: ServerStatus }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { user: storeUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tier = storeUser?.subscriptionTier ?? "FREE";
  const tierBadge = TIER_BADGE[tier] ?? TIER_BADGE.FREE;
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";
  const nameParts = user?.name?.split(" ") ?? [];
  const displayName =
    nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : (user?.name ?? "");
  const avatarUrl = storeUser?.avatarUrl ?? user?.avatarUrl;

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSettingsOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  function navigate(href: string) {
    setOpen(false);
    setSettingsOpen(false);
    router.push(href);
  }

  function handleLogout() {
    setOpen(false);
    logout();
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex h-12 items-center gap-6 border-b border-black/[0.06] bg-white/80 px-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0d1117]/80">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
          Rolevo
        </span>
      </Link>

      <nav className="flex min-w-0 flex-1 items-center gap-0.5">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Tooltip key={link.href} title={link.label} placement="bottom">
              <Link
                href={link.href}
                className={cn(
                  "flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-[#f2f2f7] text-[#1d1d1f] dark:bg-white/10 dark:text-white"
                    : "text-[#86868b] hover:bg-black/[0.04] hover:text-[#1d1d1f] dark:text-[#8e8e93] dark:hover:bg-white/[0.06] dark:hover:text-white"
                )}
              >
                <link.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-medium">{link.short}</span>
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {tier !== "PLATINUM" && (
          <Link
            href="/pricing"
            className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 transition-colors hover:text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            <Crown className="h-3 w-3" />
            Upgrade
          </Link>
        )}

        {tier === "GOLD" && (
          <Tooltip title="Gold Plan">
            <span className={cn("flex items-center", tierBadge.iconClass)}>
              <Crown className="h-4 w-4" />
            </span>
          </Tooltip>
        )}
        {tier === "PLATINUM" && (
          <Tooltip title="Platinum Plan">
            <span className={cn("flex items-center", tierBadge.iconClass)}>
              <Sparkles className="h-4 w-4" />
            </span>
          </Tooltip>
        )}

        <ServerDot status={serverStatus} />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setOpen((v) => !v);
              setSettingsOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={user?.name ?? "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-xs font-semibold text-white">
                  {initials}
                </div>
              )}
            </div>
            <span className="hidden max-w-[100px] truncate text-sm font-medium text-[#1d1d1f] lg:block dark:text-[#c9d1d9]">
              {displayName}
            </span>
            <ChevronDown
              className={cn(
                "hidden h-3.5 w-3.5 text-[#86868b] transition-transform lg:block",
                open && "rotate-180"
              )}
            />
          </button>

          {open && !settingsOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#1c1c1e]">
              <div className="border-b border-black/[0.06] bg-[#f9f9f9] px-4 py-3 dark:border-white/[0.08] dark:bg-[#0d1117]/50">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={user?.name ?? "Avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-sm font-semibold text-white">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {user?.name}
                    </p>
                    <p className="truncate text-xs text-[#86868b] dark:text-[#8e8e93]">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                    tierBadge.className
                  )}
                >
                  {tierBadge.label} Plan
                </span>
              </div>

              <div className="py-1">
                <DropdownItem
                  icon={<User className="h-4 w-4" />}
                  label="Edit Profile"
                  description="Update your info & preferences"
                  onClick={() => navigate("/profile")}
                />
                <DropdownItem
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  label="Dashboard"
                  onClick={() => navigate("/dashboard")}
                />
                <DropdownItem
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Smart Resume"
                  description="Manage resumes & ATS optimizer"
                  onClick={() => navigate("/smart-resume")}
                />
                <DropdownItem
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Applications"
                  onClick={() => navigate("/applications")}
                />
                {tier !== "PLATINUM" && (
                  <DropdownItem
                    icon={<Crown className="h-4 w-4 text-amber-500" />}
                    label="Upgrade Plan"
                    labelClass="text-amber-600 dark:text-yellow-400 font-semibold"
                    onClick={() => navigate("/pricing")}
                  />
                )}
              </div>

              <div className="border-t border-black/[0.06] py-1 dark:border-white/[0.08]">
                <DropdownItem
                  icon={<Settings className="h-4 w-4" />}
                  label="Settings"
                  description="Theme, notifications & more"
                  onClick={() => setSettingsOpen(true)}
                  chevron
                />
              </div>

              <div className="border-t border-black/[0.06] py-1 dark:border-white/[0.08]">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}

          {open && settingsOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#1c1c1e]">
              <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f9f9f9] px-4 py-3 dark:border-white/[0.08] dark:bg-[#0d1117]/50">
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="text-[#86868b] transition-colors hover:text-[#1d1d1f] dark:text-[#8e8e93] dark:hover:text-white"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  Settings
                </span>
              </div>

              <div className="py-1">
                <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#f9f9f9] dark:hover:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
                    ) : (
                      <Sun className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                        Appearance
                      </p>
                      <p className="text-xs text-[#86868b] capitalize dark:text-[#8e8e93]">
                        {theme} mode
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full border border-black/10 transition-colors focus:outline-none dark:border-white/10",
                      theme === "dark" ? "bg-indigo-600" : "bg-[#e5e5ea]"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                        theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#f9f9f9] dark:hover:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                        Notifications
                      </p>
                      <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                        Email &amp; in-app alerts
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-[#f2f2f7] px-1.5 py-0.5 text-[10px] font-medium text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#8e8e93]">
                    Soon
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#f9f9f9] dark:hover:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">Privacy</p>
                      <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                        Data &amp; visibility controls
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-[#f2f2f7] px-1.5 py-0.5 text-[10px] font-medium text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#8e8e93]">
                    Soon
                  </span>
                </div>

                <button
                  onClick={() => navigate("/pricing")}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f9f9f9] dark:hover:bg-white/[0.04]"
                >
                  <CreditCard className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      Billing &amp; Plan
                    </p>
                    <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                      Manage your subscription
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DropdownItem({
  icon,
  label,
  description,
  labelClass,
  onClick,
  chevron,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  labelClass?: string;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 transition-colors hover:bg-[#f9f9f9] dark:hover:bg-white/[0.04]"
    >
      <span className="shrink-0 text-[#86868b] dark:text-[#8e8e93]">{icon}</span>
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("text-sm font-medium text-[#1d1d1f] dark:text-white", labelClass)}>
          {label}
        </p>
        {description && (
          <p className="truncate text-xs text-[#86868b] dark:text-[#8e8e93]">{description}</p>
        )}
      </div>
      {chevron && (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 -rotate-90 text-[#86868b] dark:text-[#8e8e93]" />
      )}
    </button>
  );
}

function ServerDot({ status }: { status: ServerStatus }) {
  const cfg: Record<ServerStatus, { color: string; label: string }> = {
    up: { color: "bg-green-500", label: "Server online" },
    down: { color: "bg-red-500", label: "Server offline" },
    connecting: { color: "bg-yellow-400", label: "Connecting…" },
  };
  const { color, label } = cfg[status];
  return (
    <Tooltip title={label}>
      <div className="relative flex cursor-default items-center">
        <span className={cn("h-2 w-2 rounded-full", color)} />
        {status !== "up" && (
          <span
            className={cn(
              "absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75",
              color
            )}
          />
        )}
      </div>
    </Tooltip>
  );
}
