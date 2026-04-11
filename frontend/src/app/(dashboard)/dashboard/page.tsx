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

const STATUS_BORDER_COLORS: Record<string, string> = {
  SAVED: "border-blue-400 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10",
  APPLIED: "border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
  INTERVIEWING: "border-yellow-400 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10",
  OFFERED: "border-indigo-400 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10",
  REJECTED: "border-red-400 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10",
  WITHDRAWN: "border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10",
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
  { label: "Total Applied", value: a?.totalApplications ?? 0, icon: Send, borderColor: "border-blue-500", iconClass: "text-blue-600 dark:text-blue-400", suffix: "" },
  { label: "Applied", value: a?.applied ?? 0, icon: Send, borderColor: "border-emerald-500", iconClass: "text-emerald-600 dark:text-emerald-400", suffix: "" },
  { label: "Interviewing", value: a?.interviewing ?? 0, icon: MessageSquare, borderColor: "border-yellow-500", iconClass: "text-yellow-600 dark:text-yellow-400", suffix: "" },
  { label: "Offers", value: a?.offered ?? 0, icon: Trophy, borderColor: "border-indigo-500", iconClass: "text-indigo-600 dark:text-indigo-400", suffix: "" },
  { label: "Rejected", value: a?.rejected ?? 0, icon: XCircle, borderColor: "border-red-500", iconClass: "text-red-600 dark:text-red-400", suffix: "" },
  { label: "Avg Match", value: a?.responseRate ?? 0, icon: TrendingUp, borderColor: "border-purple-500", iconClass: "text-purple-600 dark:text-purple-400", suffix: "%" },
];

const FUNNEL_STEPS = (a: Analytics | undefined) => [
  { name: "Total", value: a?.totalApplications ?? 0, fill: "#3b82f6" },
  { name: "Applied", value: a?.applied ?? 0, fill: "#10b981" },
  { name: "Interviewing", value: a?.interviewing ?? 0, fill: "#f59e0b" },
  { name: "Offered", value: a?.offered ?? 0, fill: "#6366f1" },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1c2128] border-2 border-black dark:border-[#30363d] rounded-[4px] px-3 py-2 text-sm" style={{ boxShadow: "3px 3px 0 #000" }}>
      {label && <p className="text-gray-500 dark:text-[#8b949e] mb-1 font-bold text-xs uppercase">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="font-bold" style={{ color: p.fill || "#6366f1" }}>
          {p.name}: <span className="text-black dark:text-white">{p.value}</span>
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
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-0.5 font-medium">
            Welcome back, {firstName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wide rounded-[3px] border-2 border-black dark:border-white nb-shadow nb-lift transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Search Jobs
          </Link>
          <Link
            href="/applications"
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#21262d] text-black dark:text-[#c9d1d9] text-xs font-black uppercase tracking-wide rounded-[3px] border-2 border-black dark:border-[#30363d] nb-shadow nb-lift transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            All Applications
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-4 flex items-center gap-3`}
            style={{ boxShadow: "3px 3px 0 #000" }}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-[3px] border-2 ${s.borderColor} shrink-0`}>
              <s.icon className={`h-4 w-4 ${s.iconClass}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-black dark:text-white leading-none">
                {analyticsLoading ? (
                  <span className="inline-block w-8 h-5 bg-gray-200 dark:bg-[#30363d] rounded-[3px] animate-pulse" />
                ) : (
                  <AnimatedNumber value={s.value} suffix={s.suffix} />
                )}
              </p>
              <p className="text-xs font-bold text-gray-500 dark:text-[#8b949e] mt-0.5 truncate uppercase tracking-wide">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-5" style={{ boxShadow: "3px 3px 0 #000" }}>
          <h3 className="text-xs font-black text-black dark:text-[#c9d1d9] mb-4 uppercase tracking-widest border-b-2 border-black dark:border-[#30363d] pb-2">
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
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No application data yet" />
          )}
          {pieData.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((entry) => (
                <span key={entry.name} className={`text-[10px] font-bold px-2 py-0.5 rounded-[3px] border ${STATUS_BORDER_COLORS[entry.name] ?? "border-gray-400 text-gray-600"}`}>
                  {entry.name}: {entry.value}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-5" style={{ boxShadow: "3px 3px 0 #000" }}>
          <h3 className="text-xs font-black text-black dark:text-[#c9d1d9] mb-4 uppercase tracking-widest border-b-2 border-black dark:border-[#30363d] pb-2">
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
                <Tooltip content={<ChartTooltip />} />
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
        <div className="bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-5" style={{ boxShadow: "3px 3px 0 #000" }}>
          <h3 className="text-xs font-black text-black dark:text-[#c9d1d9] mb-4 uppercase tracking-widest border-b-2 border-black dark:border-[#30363d] pb-2">
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
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-5 space-y-2" style={{ boxShadow: "3px 3px 0 #000" }}>
          <h3 className="text-xs font-black text-black dark:text-[#c9d1d9] uppercase tracking-widest border-b-2 border-black dark:border-[#30363d] pb-2 mb-3">
            Quick Actions
          </h3>
          {[
            { href: "/jobs", icon: Search, label: "Search Jobs", color: "text-blue-600 dark:text-blue-400", border: "border-blue-400" },
            { href: "/resumes", icon: FileText, label: "Upload Resume", color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-400" },
            { href: "/smart-resume", icon: Sparkles, label: "Smart Resume", color: "text-purple-600 dark:text-purple-400", border: "border-purple-400" },
            { href: "/cover-letters", icon: Zap, label: "Cover Letters", color: "text-amber-600 dark:text-yellow-400", border: "border-amber-400" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[3px] bg-gray-50 dark:bg-[#0d1117] hover:bg-amber-50 dark:hover:bg-[#21262d] border-2 border-black dark:border-[#30363d] hover:border-amber-400 dark:hover:border-amber-400 transition-all group"
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-[3px] border-2 ${a.border} shrink-0`}>
                <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-black dark:text-[#c9d1d9] group-hover:text-black dark:group-hover:text-white transition-colors">
                {a.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-gray-400 dark:text-[#30363d] group-hover:text-black dark:group-hover:text-[#8b949e] transition-colors" />
            </Link>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-5" style={{ boxShadow: "3px 3px 0 #000" }}>
          <div className="flex items-center justify-between border-b-2 border-black dark:border-[#30363d] pb-2 mb-4">
            <h3 className="text-xs font-black text-black dark:text-[#c9d1d9] uppercase tracking-widest">
              Recently Applied
            </h3>
            <Link
              href="/applications"
              className="text-xs font-black text-indigo-600 dark:text-[#58a6ff] hover:text-indigo-800 dark:hover:text-blue-300 flex items-center gap-1 uppercase tracking-wide transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {appsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-[#21262d] rounded-[3px] animate-pulse" />
              ))}
            </div>
          ) : recentApps?.content && recentApps.content.length > 0 ? (
            <div className="divide-y-2 divide-black/10 dark:divide-[#21262d]">
              {recentApps.content.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-black dark:text-white truncate">
                      {app.job.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#8b949e] font-medium">
                      {app.job.company} · {formatDate(app.appliedAt)}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[4px] border-2 border-black dark:border-white bg-indigo-50 dark:bg-indigo-600/10">
                <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-black text-black dark:text-[#c9d1d9] uppercase tracking-wide">No applications yet</p>
              <p className="text-xs text-gray-500 dark:text-[#8b949e] max-w-xs font-medium">
                Search jobs and apply with one click to track your progress here.
              </p>
              <Link
                href="/jobs"
                className="mt-1 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wide rounded-[3px] border-2 border-black dark:border-white nb-shadow nb-lift flex items-center gap-1.5"
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`ml-3 text-[10px] font-black px-2 py-0.5 rounded-[3px] border shrink-0 uppercase tracking-wide ${
        STATUS_BORDER_COLORS[status] ?? "border-gray-400 text-gray-600 bg-gray-50"
      }`}
    >
      {status}
    </span>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-sm font-bold text-gray-500 dark:text-[#8b949e] uppercase tracking-wide">
      {label}
    </div>
  );
}
