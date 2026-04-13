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
  Zap,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Clock,
  Newspaper,
} from "@/components/ui/icons";
import PageTransition, { FadeIn, StaggerList, StaggerItem } from "@/components/ui/PageTransition";

// ─── Colour maps ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  SAVED: "#3b82f6",
  APPLIED: "#10b981",
  INTERVIEWING: "#f59e0b",
  OFFERED: "#6366f1",
  REJECTED: "#ef4444",
  WITHDRAWN: "#6b7280",
};

const STATUS_BADGE: Record<string, string> = {
  SAVED: "bg-blue-50   dark:bg-blue-500/10   text-blue-600   dark:text-blue-400",
  APPLIED: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  INTERVIEWING: "bg-amber-50  dark:bg-amber-500/10  text-amber-600  dark:text-amber-400",
  OFFERED: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  REJECTED: "bg-red-50    dark:bg-red-500/10    text-red-600    dark:text-red-400",
  WITHDRAWN: "bg-gray-100  dark:bg-gray-500/10   text-gray-500   dark:text-gray-400",
};

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const p = Math.min((ts - start.current) / 900, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

// ─── Greeting helpers ─────────────────────────────────────────────────────────

function getGreeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name}`;
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Stat card definitions ────────────────────────────────────────────────────

function buildStatCards(a: Analytics | undefined) {
  return [
    {
      label: "Total Applied",
      value: a?.totalApplications ?? 0,
      icon: Send,
      iconBg: "bg-blue-50   dark:bg-blue-500/10",
      iconColor: "text-blue-500   dark:text-blue-400",
      suffix: "",
    },
    {
      label: "Applied",
      value: a?.applied ?? 0,
      icon: Send,
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      suffix: "",
    },
    {
      label: "Interviewing",
      value: a?.interviewing ?? 0,
      icon: MessageSquare,
      iconBg: "bg-amber-50  dark:bg-amber-500/10",
      iconColor: "text-amber-500  dark:text-amber-400",
      suffix: "",
    },
    {
      label: "Offers",
      value: a?.offered ?? 0,
      icon: Trophy,
      iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
      iconColor: "text-indigo-500 dark:text-indigo-400",
      suffix: "",
    },
    {
      label: "Rejected",
      value: a?.rejected ?? 0,
      icon: XCircle,
      iconBg: "bg-red-50    dark:bg-red-500/10",
      iconColor: "text-red-500    dark:text-red-400",
      suffix: "",
    },
    {
      label: "Avg Match",
      value: a?.responseRate ?? 0,
      icon: TrendingUp,
      iconBg: "bg-purple-50 dark:bg-purple-500/10",
      iconColor: "text-purple-500 dark:text-purple-400",
      suffix: "%",
    },
  ];
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-black/[0.07] bg-white px-3 py-2.5 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-white/[0.09] dark:bg-[#1c1c1e]">
      {label && (
        <p className="mb-1 text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">{label}</p>
      )}
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
    ? Object.entries(analytics.byStatus)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const funnelData = [
    { name: "Total", value: analytics?.totalApplications ?? 0, fill: "#3b82f6" },
    { name: "Applied", value: analytics?.applied ?? 0, fill: "#10b981" },
    { name: "Interviewing", value: analytics?.interviewing ?? 0, fill: "#f59e0b" },
    { name: "Offered", value: analytics?.offered ?? 0, fill: "#6366f1" },
  ];

  const stats = buildStatCards(analytics);

  return (
    <PageTransition>
      <div className="space-y-6 pb-10">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
              {getGreeting(firstName)}
            </h1>
            <p className="mt-0.5 text-sm text-[#86868b] dark:text-[#8e8e93]">{getTodayLabel()}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href="/jobs"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-[0_2px_8px_rgba(99,102,241,0.38)] transition-all duration-150 hover:bg-indigo-700 hover:shadow-[0_4px_14px_rgba(99,102,241,0.48)]"
            >
              <Search className="h-3.5 w-3.5" />
              Search Jobs
            </Link>
            <Link
              href="/applications"
              className="flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-150 hover:bg-[#f5f5f7] dark:border-white/[0.10] dark:bg-[#1c1c1e] dark:text-white dark:hover:bg-[#2c2c2e]"
            >
              <Send className="h-3.5 w-3.5" />
              Applications
            </Link>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-3 rounded-2xl border border-black/[0.05] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:border-white/[0.07] dark:bg-[#16161a] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconBg}`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl leading-none font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                  {analyticsLoading ? (
                    <span className="inline-block h-6 w-8 animate-pulse rounded-lg bg-[#f2f2f7] dark:bg-[#2c2c2e]" />
                  ) : (
                    <AnimatedNumber value={s.value} suffix={s.suffix} />
                  )}
                </p>
                <p className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:border-white/[0.07] dark:bg-[#16161a] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <h3 className="mb-5 text-base font-semibold text-[#1d1d1f] dark:text-white">
              Status Breakdown
            </h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="40%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pieData.map((entry) => (
                    <span
                      key={entry.name}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[entry.name] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                      />
                      {entry.name}: {entry.value}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart label="No application data yet" />
            )}
          </div>

          <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:border-white/[0.07] dark:bg-[#16161a] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <h3 className="mb-5 text-base font-semibold text-[#1d1d1f] dark:text-white">
              Application Funnel
            </h3>
            {funnelData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical" barSize={16}>
                  <XAxis
                    type="number"
                    tick={{ fill: "#86868b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#86868b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={88}
                  />
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Quick actions */}
          <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:border-white/[0.07] dark:bg-[#16161a] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <h3 className="mb-4 text-base font-semibold text-[#1d1d1f] dark:text-white">
              Quick Actions
            </h3>
            <div className="space-y-1">
              {[
                {
                  href: "/jobs",
                  icon: Search,
                  label: "Search Jobs",
                  iconBg: "bg-blue-50   dark:bg-blue-500/10",
                  iconColor: "text-blue-500   dark:text-blue-400",
                },
                {
                  href: "/smart-resume",
                  icon: Sparkles,
                  label: "Smart Resume",
                  iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
                  iconColor: "text-indigo-500 dark:text-indigo-400",
                },
                {
                  href: "/cover-letters",
                  icon: Zap,
                  label: "Cover Letters",
                  iconBg: "bg-amber-50  dark:bg-amber-500/10",
                  iconColor: "text-amber-500  dark:text-amber-400",
                },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${a.iconBg} shrink-0`}
                  >
                    <a.icon className={`h-3.5 w-3.5 ${a.iconColor}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-[#1d1d1f] dark:text-white">
                    {a.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#c7c7cc] transition-colors group-hover:text-[#86868b] dark:text-[#3a3a3c]" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recently applied */}
          <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] lg:col-span-2 dark:border-white/[0.07] dark:bg-[#16161a] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                Recently Applied
              </h3>
              <Link
                href="/applications"
                className="flex items-center gap-0.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View all <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
              </Link>
            </div>

            {appsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 flex-1 animate-pulse rounded-lg bg-[#f2f2f7] dark:bg-[#2c2c2e]" />
                    <div className="h-4 w-20 animate-pulse rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e]" />
                  </div>
                ))}
              </div>
            ) : recentApps?.content && recentApps.content.length > 0 ? (
              <StaggerList className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {recentApps.content.map((app) => (
                  <StaggerItem key={app.id}>
                    <div className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="truncate text-sm font-medium text-[#1d1d1f] dark:text-white">
                          {app.job.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#86868b] dark:text-[#8e8e93]">
                          {app.job.company} · {formatDate(app.appliedAt)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[app.status] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {app.status}
                      </span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerList>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                  <Zap className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                    No applications yet
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-[#86868b] dark:text-[#8e8e93]">
                    Search jobs and apply with one click to track your progress here.
                  </p>
                </div>
                <Link
                  href="/jobs"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-[0_2px_8px_rgba(99,102,241,0.38)] transition-all duration-150 hover:bg-indigo-700"
                >
                  <Search className="h-3.5 w-3.5" />
                  Find Jobs
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Career News Feed ──────────────────────────────────────────────── */}
        <NewsFeed />
      </div>
    </PageTransition>
  );
}

// ─── Career News Feed ─────────────────────────────────────────────────────────

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  author: string;
  tags: string[];
  readingTime: number;
}

function newsTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TAG_COLORS: Record<string, string> = {
  career: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  jobs: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  productivity: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  programming: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

function NewsFeed() {
  const { data: news, isLoading } = useQuery<NewsItem[]>({
    queryKey: ["career-news"],
    queryFn: async () => (await fetch("/api/news")).json(),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:border-white/[0.07] dark:bg-[#16161a] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
            <Newspaper className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">Career News</h3>
          <span className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-[10px] font-semibold text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#8e8e93]">
            Live
          </span>
        </div>
        <a
          href="https://dev.to/t/career"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          More <ExternalLink className="ml-0.5 h-3 w-3" />
        </a>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="space-y-2 rounded-xl border border-black/[0.05] p-4 dark:border-white/[0.06]"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-[#f2f2f7] dark:bg-[#2c2c2e]" />
              <div className="h-4 animate-pulse rounded bg-[#f2f2f7] dark:bg-[#2c2c2e]" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#f2f2f7] dark:bg-[#2c2c2e]" />
            </div>
          ))}
        </div>
      ) : news && news.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {news.slice(0, 8).map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-xl border border-black/[0.05] p-4 transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-white/[0.06] dark:hover:border-indigo-700 dark:hover:bg-indigo-500/5"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {item.tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${TAG_COLORS[t] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400"}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="line-clamp-2 text-sm leading-snug font-medium text-[#1d1d1f] transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                {item.title}
              </p>
              {item.summary && (
                <p className="line-clamp-2 text-xs text-[#86868b] dark:text-[#8e8e93]">
                  {item.summary}
                </p>
              )}
              <div className="mt-auto flex items-center gap-2 pt-1 text-[10px] text-[#86868b] dark:text-[#8e8e93]">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{item.readingTime} min read</span>
                <span className="ml-auto">{newsTimeAgo(item.publishedAt)}</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[#86868b] dark:text-[#8e8e93]">
          No articles available right now — check back soon.
        </p>
      )}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-[#86868b] dark:text-[#8e8e93]">
      {label}
    </div>
  );
}
