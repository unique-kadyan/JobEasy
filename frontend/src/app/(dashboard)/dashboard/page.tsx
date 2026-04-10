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
  CartesianGrid,
  Legend,
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
} from "lucide-react";

const STATUS_PIE_COLORS: Record<string, string> = {
  SAVED: "#3b82f6",
  APPLIED: "#10b981",
  INTERVIEWING: "#f59e0b",
  OFFERED: "#6366f1",
  REJECTED: "#ef4444",
  WITHDRAWN: "#6b7280",
};

const STATUS_LABEL_COLORS: Record<string, string> = {
  SAVED: "text-blue-400",
  APPLIED: "text-emerald-400",
  INTERVIEWING: "text-yellow-400",
  OFFERED: "text-indigo-400",
  REJECTED: "text-red-400",
  WITHDRAWN: "text-gray-400",
};

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    startRef.current = null;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / 800, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{display}{suffix}</>;
}

const STAT_CARDS = (a: Analytics | undefined) => [
  { label: "Total Applied", value: a?.totalApplications ?? 0, icon: Send, color: "text-blue-400", bg: "bg-blue-500/10", suffix: "" },
  { label: "Applied", value: a?.applied ?? 0, icon: Send, color: "text-emerald-400", bg: "bg-emerald-500/10", suffix: "" },
  { label: "Interviewing", value: a?.interviewing ?? 0, icon: MessageSquare, color: "text-yellow-400", bg: "bg-yellow-500/10", suffix: "" },
  { label: "Offers", value: a?.offered ?? 0, icon: Trophy, color: "text-indigo-400", bg: "bg-indigo-500/10", suffix: "" },
  { label: "Rejected", value: a?.rejected ?? 0, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", suffix: "" },
  { label: "Avg Match", value: a?.responseRate ?? 0, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10", suffix: "%" },
];

const FUNNEL_STEPS = (a: Analytics | undefined) => [
  { name: "Total", value: a?.totalApplications ?? 0, fill: "#3b82f6" },
  { name: "Applied", value: a?.applied ?? 0, fill: "#10b981" },
  { name: "Interviewing", value: a?.interviewing ?? 0, fill: "#f59e0b" },
  { name: "Offered", value: a?.offered ?? 0, fill: "#6366f1" },
];

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c2128] border border-[#30363d] rounded-lg px-3 py-2 text-sm shadow-xl">
      {label && <p className="text-[#8b949e] mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill || "#c9d1d9" }}>
          {p.name}: <span className="font-semibold text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

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

  const sourceData = analytics?.bySource
    ? Object.entries(analytics.bySource)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : [];

  const funnelData = FUNNEL_STEPS(analytics);
  const stats = STAT_CARDS(analytics);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">Your job search at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Search className="h-4 w-4" />
            Search Jobs
          </Link>
          <Link
            href="/applications"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-sm font-medium rounded-lg border border-[#30363d] transition-colors"
          >
            All Jobs
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3 hover:border-[#58a6ff]/40 transition-colors"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${s.bg}`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-white leading-none">
                {analyticsLoading ? (
                  <span className="inline-block w-8 h-5 bg-[#30363d] rounded animate-pulse" />
                ) : (
                  <AnimatedNumber value={s.value} suffix={s.suffix} />
                )}
              </p>
              <p className="text-xs text-[#8b949e] mt-0.5 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#c9d1d9] mb-4 uppercase tracking-wide">
            Status Breakdown
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="40%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_PIE_COLORS[entry.name] ?? "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(value) => (
                    <span className={`text-xs ${STATUS_LABEL_COLORS[value] ?? "text-[#8b949e]"}`}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No application data yet" />
          )}
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#c9d1d9] mb-4 uppercase tracking-wide">
            Application Funnel
          </h3>
          {funnelData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" barSize={20}>
                <CartesianGrid horizontal={false} stroke="#30363d" />
                <XAxis
                  type="number"
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#8b949e", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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

      {sourceData.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#c9d1d9] mb-4 uppercase tracking-wide">
            Applications by Source
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sourceData} barSize={24}>
              <CartesianGrid vertical={false} stroke="#30363d" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#8b949e", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8b949e", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#c9d1d9] uppercase tracking-wide mb-3">
            Quick Actions
          </h3>
          {[
            { href: "/jobs", icon: Search, label: "Search Jobs", color: "text-blue-400" },
            { href: "/resumes", icon: FileText, label: "Upload Resume", color: "text-indigo-400" },
            { href: "/smart-resume", icon: Sparkles, label: "Smart Resume", color: "text-purple-400" },
            { href: "/cover-letters", icon: Zap, label: "Cover Letters", color: "text-yellow-400" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] transition-colors group"
            >
              <a.icon className={`h-4 w-4 ${a.color}`} />
              <span className="text-sm text-[#c9d1d9] group-hover:text-white transition-colors">
                {a.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-[#30363d] group-hover:text-[#8b949e] transition-colors" />
            </Link>
          ))}
        </div>

        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#c9d1d9] uppercase tracking-wide">
              Recently Applied
            </h3>
            <Link
              href="/applications"
              className="text-xs text-[#58a6ff] hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {appsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#21262d] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentApps?.content && recentApps.content.length > 0 ? (
            <div className="divide-y divide-[#21262d]">
              {recentApps.content.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {app.job.title}
                    </p>
                    <p className="text-xs text-[#8b949e]">
                      {app.job.company} · {formatDate(app.appliedAt)}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#21262d]">
                <Zap className="h-6 w-6 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-[#c9d1d9]">No applications yet</p>
              <p className="text-xs text-[#8b949e] max-w-xs">
                Search jobs and apply with one click to track your progress here.
              </p>
              <Link
                href="/jobs"
                className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                Find Jobs
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  SAVED: "bg-blue-500/15 text-blue-400",
  APPLIED: "bg-emerald-500/15 text-emerald-400",
  INTERVIEWING: "bg-yellow-500/15 text-yellow-400",
  OFFERED: "bg-indigo-500/15 text-indigo-400",
  REJECTED: "bg-red-500/15 text-red-400",
  WITHDRAWN: "bg-gray-500/15 text-gray-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
        STATUS_BADGE_COLORS[status] ?? "bg-gray-500/15 text-gray-400"
      }`}
    >
      {status}
    </span>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-sm text-[#8b949e]">
      {label}
    </div>
  );
}
