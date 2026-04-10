"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { cn } from "@/lib/utils";
import {
  Zap,
  Crown,
  LogOut,
  User,
  FileText,
  Briefcase,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  Bell,
  Shield,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";
import type { ServerStatus } from "@/hooks/useKeepAlive";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/resumes", label: "Resumes" },
  { href: "/smart-resume", label: "Smart Resume" },
  { href: "/cover-letters", label: "Cover Letters" },
];

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  FREE: { label: "Free", className: "bg-gray-700 text-gray-300" },
  GOLD: {
    label: "Gold",
    className: "bg-yellow-950 text-yellow-400 border border-yellow-700/60",
  },
  PLATINUM: {
    label: "Platinum",
    className: "bg-slate-800 text-slate-300 border border-slate-600/60",
  },
};

export default function Navbar({
  serverStatus = "connecting",
}: {
  serverStatus?: ServerStatus;
}) {
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

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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
    <header className="fixed top-0 left-0 right-0 z-40 flex h-12 items-center border-b border-[#30363d] bg-[#0d1117] px-4 gap-6">
      <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-white">Kaddy</span>
        <span className="text-[10px] bg-indigo-900/50 text-indigo-400 border border-indigo-700/50 px-1.5 py-0.5 rounded-full font-medium">
          AI
        </span>
      </Link>

      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-[#21262d] text-white"
                  : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        {tier !== "PLATINUM" && (
          <Link
            href="/pricing"
            className="flex items-center gap-1 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade
          </Link>
        )}

        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            tierBadge.className
          )}
        >
          {tierBadge.label}
        </span>

        <ServerDot status={serverStatus} />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setOpen((v) => !v);
              setSettingsOpen(false);
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[#21262d] transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-700 text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <span className="text-sm text-[#c9d1d9] hidden lg:block max-w-[120px] truncate">
              {user?.name}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-[#8b949e] transition-transform hidden lg:block",
                open && "rotate-180"
              )}
            />
          </button>

          {open && !settingsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117]/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-700 text-white text-sm font-semibold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-[#8b949e] truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "mt-2 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full",
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
                  icon={<FileText className="h-4 w-4" />}
                  label="My Resumes"
                  onClick={() => navigate("/resumes")}
                />
                <DropdownItem
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Applications"
                  onClick={() => navigate("/applications")}
                />
                {tier !== "PLATINUM" && (
                  <DropdownItem
                    icon={<Crown className="h-4 w-4 text-yellow-400" />}
                    label="Upgrade Plan"
                    labelClass="text-yellow-400"
                    onClick={() => navigate("/pricing")}
                  />
                )}
              </div>

              <div className="border-t border-[#30363d] py-1">
                <DropdownItem
                  icon={<Settings className="h-4 w-4" />}
                  label="Settings"
                  description="Theme, notifications & more"
                  onClick={() => setSettingsOpen(true)}
                  chevron
                />
              </div>

              <div className="border-t border-[#30363d] py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}

          {open && settingsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#30363d] bg-[#0d1117]/50">
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="text-[#8b949e] hover:text-white transition-colors"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <span className="text-sm font-semibold text-white">
                  Settings
                </span>
              </div>

              <div className="py-1">
                <div className="flex items-center justify-between px-4 py-3 hover:bg-[#21262d] transition-colors">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4 text-[#8b949e]" />
                    ) : (
                      <Sun className="h-4 w-4 text-[#8b949e]" />
                    )}
                    <div>
                      <p className="text-sm text-white">Appearance</p>
                      <p className="text-xs text-[#8b949e] capitalize">
                        {theme} mode
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                      theme === "dark" ? "bg-indigo-600" : "bg-[#30363d]"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between px-4 py-3 hover:bg-[#21262d] transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-[#8b949e]" />
                    <div>
                      <p className="text-sm text-white">Notifications</p>
                      <p className="text-xs text-[#8b949e]">
                        Email &amp; in-app alerts
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8b949e] bg-[#30363d] px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3 hover:bg-[#21262d] transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-[#8b949e]" />
                    <div>
                      <p className="text-sm text-white">Privacy</p>
                      <p className="text-xs text-[#8b949e]">
                        Data &amp; visibility controls
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8b949e] bg-[#30363d] px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </div>

                <button
                  onClick={() => navigate("/pricing")}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-[#21262d] transition-colors"
                >
                  <CreditCard className="h-4 w-4 text-[#8b949e]" />
                  <div className="text-left">
                    <p className="text-sm text-white">Billing &amp; Plan</p>
                    <p className="text-xs text-[#8b949e]">
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
      className="flex w-full items-center gap-3 px-4 py-2 hover:bg-[#21262d] transition-colors"
    >
      <span className="text-[#8b949e] shrink-0">{icon}</span>
      <div className="flex-1 text-left min-w-0">
        <p className={cn("text-sm text-white", labelClass)}>{label}</p>
        {description && (
          <p className="text-xs text-[#8b949e] truncate">{description}</p>
        )}
      </div>
      {chevron && (
        <ChevronDown className="h-3.5 w-3.5 text-[#8b949e] -rotate-90 shrink-0" />
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
    <div className="relative flex items-center" title={label}>
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {status !== "up" && (
        <span
          className={cn(
            "absolute inline-flex h-2 w-2 rounded-full opacity-75 animate-ping",
            color
          )}
        />
      )}
    </div>
  );
}
