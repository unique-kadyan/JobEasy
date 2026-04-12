"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/lib/api";
import type { Analytics, Application, PagedResponse } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";
import {
  Send,
  MessageSquare,
  Trophy,
  XCircle,
  TrendingUp,
  Search,
  FileText,
  Zap,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from "@/components/ui/icons";
import PageTransition, { FadeIn, StaggerList, StaggerItem } from "@/components/ui/PageTransition";

// ─── Colour maps ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  SAVED:        "#3b82f6",
  APPLIED:      "#10b981",
  INTERVIEWING: "#f59e0b",
  OFFERED:      "#6366f1",
  REJECTED:     "#ef4444",
  WITHDRAWN:    "#6b7280",
};

const STATUS_BADGE: Record<string, string> = {
  SAVED:        "bg-blue-50   dark:bg-blue-500/10   text-blue-600   dark:text-blue-400",
  APPLIED:      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  INTERVIEWING: "bg-amber-50  dark:bg-amber-500/10  text-amber-600  dark:text-amber-400",
  OFFERED:      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  REJECTED:     "bg-red-50    dark:bg-red-500/10    text-red-600    dark:text-red-400",
  WITHDRAWN:    "bg-gray-100  dark:bg-gray-500/10   text-gray-500   dark:text-gray-400",
};

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const p = Math.min((ts - start.current) / 900, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);

  return <>{display}{suffix}</>;
}

// ─── Greeting helpers ─────────────────────────────────────────────────────────

function getGreeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name}`;
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

// ─── Stat card definitions ────────────────────────────────────────────────────

function buildStatCards(a: Analytics | undefined) {
  return [
    { label: "Total Applied", value: a?.totalApplications ?? 0, icon: Send,        iconBg: "bg-blue-50   dark:bg-blue-500/10",   iconColor: "text-blue-500   dark:text-blue-400",   suffix: "" },
    { label: "Applied",       value: a?.applied ?? 0,           icon: Send,        iconBg: "bg-emerald-50 dark:bg-emerald-500/10", iconColor: "text-emerald-500 dark:text-emerald-400", suffix: "" },
    { label: "Interviewing",  value: a?.interviewing ?? 0,      icon: MessageSquare, iconBg: "bg-amber-50  dark:bg-amber-500/10",  iconColor: "text-amber-500  dark:text-amber-400",  suffix: "" },
    { label: "Offers",        value: a?.offered ?? 0,           icon: Trophy,      iconBg: "bg-indigo-50 dark:bg-indigo-500/10", iconColor: "text-indigo-500 dark:text-indigo-400", suffix: "" },
    { label: "Rejected",      value: a?.rejected ?? 0,          icon: XCircle,     iconBg: "bg-red-50    dark:bg-red-500/10",    iconColor: "text-red-500    dark:text-red-400",    suffix: "" },
    { label: "Avg Match",     value: a?.responseRate ?? 0,      icon: TrendingUp,  iconBg: "bg-purple-50 dark:bg-purple-500/10", iconColor: "text-purple-500 dark:text-purple-400", suffix: "%" },
  ];
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.07] dark:border-white/[0.09] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-sm">
      {label && <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: p.fill || "#6366f1" }}>
          {p.name}: <span className="text-[#1d1d1f] dark:text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get("/analytics/summary")).data,
  });

  const { data: recentApps, isLoading: appsLoading } = useQuery<PagedResponse<Application>>({
    queryKey: ["applications", null, 0],
    queryFn: async () => (await api.get("/applications?page=0&size=6")).data,
  });

  const pieData = analytics?.byStatus
    ? Object.entries(analytics.byStatus).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : [];

  const funnelData = [
    { name: "Total",        value: analytics?.totalApplications ?? 0, fill: "#3b82f6" },
    { name: "Applied",      value: analytics?.applied ?? 0,           fill: "#10b981" },
    { name: "Interviewing", value: analytics?.interviewing ?? 0,      fill: "#f59e0b" },
    { name: "Offered",      value: analytics?.offered ?? 0,           fill: "#6366f1" },
  ];

  const stats = buildStatCards(analytics);

  return (
    <PageTransition>
    <div className="space-y-6 pb-10">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
            {getGreeting(firstName)}
          </h1>
          <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">
            {getTodayLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-[0_2px_8px_rgba(99,102,241,0.38)] hover:bg-indigo-700 hover:shadow-[0_4px_14px_rgba(99,102,241,0.48)] transition-all duration-150"
          >
            <Search className="h-3.5 w-3.5" />
            Search Jobs
          </Link>
          <Link
            href="/applications"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white text-sm font-medium border border-black/[0.08] dark:border-white/[0.10] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-150"
          >
            <Send className="h-3.5 w-3.5" />
            Applications
          </Link>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-4 flex flex-col gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.iconBg}`}>
              <s.icon className={`h-4 w-4 ${s.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight leading-none">
                {analyticsLoading
                  ? <span className="inline-block w-8 h-6 rounded-lg bg-[#f2f2f7] dark:bg-[#2c2c2e] animate-pulse" />
                  : <AnimatedNumber value={s.value} suffix={s.suffix} />
                }
              </p>
              <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white mb-5">Status Breakdown</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="40%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-3">
                {pieData.map((entry) => (
                  <span key={entry.name} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[entry.name] ?? "bg-gray-100 text-gray-500"}`}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[entry.name] }} />
                    {entry.name}: {entry.value}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart label="No application data yet" />
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white mb-5">Application Funnel</h3>
          {funnelData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} layout="vertical" barSize={16}>
                <XAxis type="number" tick={{ fill: "#86868b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#86868b", fontSize: 12 }} axisLine={false} tickLine={false} width={88} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funnelData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Apply to jobs to see your funnel" />
          )}
        </div>
      </div>

      {/* ── Quick actions + Recently applied ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Quick actions */}
        <div className="rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-1">
            {[
              { href: "/jobs",          icon: Search,   label: "Search Jobs",   iconBg: "bg-blue-50   dark:bg-blue-500/10",   iconColor: "text-blue-500   dark:text-blue-400" },
              { href: "/resumes",       icon: FileText,  label: "Upload Resume", iconBg: "bg-indigo-50 dark:bg-indigo-500/10", iconColor: "text-indigo-500 dark:text-indigo-400" },
              { href: "/smart-resume",  icon: Sparkles,  label: "Smart Resume",  iconBg: "bg-purple-50 dark:bg-purple-500/10", iconColor: "text-purple-500 dark:text-purple-400" },
              { href: "/cover-letters", icon: Zap,       label: "Cover Letters", iconBg: "bg-amber-50  dark:bg-amber-500/10",  iconColor: "text-amber-500  dark:text-amber-400" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors duration-150 group"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.iconBg} shrink-0`}>
                  <a.icon className={`h-3.5 w-3.5 ${a.iconColor}`} />
                </div>
                <span className="text-sm font-medium text-[#1d1d1f] dark:text-white flex-1">{a.label}</span>
                <ChevronRight className="h-4 w-4 text-[#c7c7cc] dark:text-[#3a3a3c] group-hover:text-[#86868b] transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recently applied */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">Recently Applied</h3>
            <Link
              href="/applications"
              className="flex items-center gap-0.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>
          </div>

          {appsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 h-4 rounded-lg bg-[#f2f2f7] dark:bg-[#2c2c2e] animate-pulse" />
                  <div className="h-4 w-20 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentApps?.content && recentApps.content.length > 0 ? (
            <StaggerList className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {recentApps.content.map((app) => (
                <StaggerItem key={app.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate">{app.job.title}</p>
                      <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                        {app.job.company} · {formatDate(app.appliedAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[app.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {app.status}
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <Zap className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">No applications yet</p>
                <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mt-1 max-w-xs">
                  Search jobs and apply with one click to track your progress here.
                </p>
              </div>
              <Link
                href="/jobs"
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-[0_2px_8px_rgba(99,102,241,0.38)] hover:bg-indigo-700 transition-all duration-150"
              >
                <Search className="h-3.5 w-3.5" />
                Find Jobs
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-sm text-[#86868b] dark:text-[#8e8e93]">
      {label}
    </div>
  );
}
