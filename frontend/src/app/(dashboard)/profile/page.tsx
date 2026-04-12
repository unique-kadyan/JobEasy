"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import MuiTooltip from "@mui/material/Tooltip";
import {
  User,
  Save,
  CheckCircle,
  Link2,
  GitBranch,
  Globe,
  FileText,
  Briefcase,
  GraduationCap,
  Code2,
  ExternalLink,
  Edit2,
  Trophy,
} from "@/components/ui/icons";
import GitHubIcon from "@mui/icons-material/GitHub";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { formatDate, toCamelCase } from "@/lib/utils";
import type { Resume, User as UserType } from "@/types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseResumeDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (/^(present|current|now)$/.test(s)) return new Date();
  const m1 = s.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (m1) {
    const mo = MONTH_MAP[m1[1]];
    if (mo !== undefined) return new Date(parseInt(m1[2]), mo, 1);
  }
  const m2 = s.match(/^(\d{4})-(\d{2})/);
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, 1);
  const m3 = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m3) return new Date(parseInt(m3[2]), parseInt(m3[1]) - 1, 1);
  const m4 = s.match(/^(\d{4})$/);
  if (m4) return new Date(parseInt(m4[1]), 0, 1);
  return null;
}

function durationStr(startMs: number, endMs: number): string {
  const months = Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24 * 30.44)));
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  return (
    [yrs > 0 && `${yrs} yr${yrs !== 1 ? "s" : ""}`, mos > 0 && `${mos} mo`]
      .filter(Boolean)
      .join(" ") || "< 1 mo"
  );
}

// ─── Company colour (HSL hash) ─────────────────────────────────────────────────

function companyColors(company: string, isDark: boolean) {
  let h = 0;
  const key = (company || "").toLowerCase().trim();
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const sat = 55 + (h % 25);
  return isDark
    ? { bar: `hsl(${hue},${sat}%,22%)`, text: `hsl(${hue},${sat}%,78%)`, border: `hsl(${hue},${sat}%,40%)` }
    : { bar: `hsl(${hue},${sat}%,91%)`, text: `hsl(${hue},${sat}%,26%)`, border: `hsl(${hue},${sat}%,68%)` };
}

// ─── Greedy row assignment ─────────────────────────────────────────────────────

interface LayoutBar {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bullets?: string[];
  startMs: number;
  endMs: number;
  row: number;
}

function assignRows(items: Omit<LayoutBar, "row">[]): LayoutBar[] {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs);
  const rowEnds: number[] = [];
  const BUF = 30 * 24 * 3600 * 1000;
  return sorted.map((bar) => {
    let row = rowEnds.findIndex((end) => end + BUF <= bar.startMs);
    if (row === -1) { row = rowEnds.length; rowEnds.push(bar.endMs); }
    else rowEnds[row] = bar.endMs;
    return { ...bar, row };
  });
}

// ─── ExperienceTimeline ────────────────────────────────────────────────────────

type ExpEntry = {
  company?: string; title?: string; startDate?: string;
  endDate?: string; current?: boolean; location?: string; bullets?: string[];
};

function ExperienceTimeline({ experiences }: { experiences: ExpEntry[] }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.offsetWidth || 700);
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width || 700);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bars = useMemo(() => {
    const raw = experiences
      .map((exp) => {
        const start = parseResumeDate(exp.startDate);
        if (!start) return null;
        const end = exp.current ? new Date() : (parseResumeDate(exp.endDate) ?? new Date());
        return {
          company: exp.company ?? "Company",
          title: exp.title ?? "Role",
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          current: exp.current,
          bullets: exp.bullets,
          startMs: start.getTime(),
          endMs: end.getTime(),
        };
      })
      .filter(Boolean) as Omit<LayoutBar, "row">[];
    return assignRows(raw);
  }, [experiences]);

  if (bars.length === 0) return null;

  const startYear = new Date(Math.min(...bars.map((b) => b.startMs))).getFullYear();
  const axisMinMs = new Date(startYear, 0, 1).getTime();
  const axisMaxMs = Date.now();
  const totalMs = axisMaxMs - axisMinMs;

  const toPercent = (ms: number) =>
    Math.max(0, Math.min(100, ((ms - axisMinMs) / totalMs) * 100));

  const endYear = new Date(axisMaxMs).getFullYear();
  const allYears = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const visibleYears = allYears.filter((y) => {
    const px = ((new Date(y, 0).getTime() - axisMinMs) / totalMs) * containerWidth;
    const prevPx =
      y > startYear
        ? ((new Date(y - 1, 0).getTime() - axisMinMs) / totalMs) * containerWidth
        : -999;
    return y === startYear || px - prevPx >= 42;
  });

  const numRows = Math.max(...bars.map((b) => b.row)) + 1;
  const ROW_H = 22;
  const ROW_GAP = 6;
  const CHART_H = numRows * (ROW_H + ROW_GAP) - ROW_GAP;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* Year axis */}
      <div className="relative h-5 mb-2">
        {visibleYears.map((year) => (
          <span
            key={year}
            style={{ left: `${toPercent(new Date(year, 0).getTime())}%`, transform: "translateX(-50%)" }}
            className="absolute text-[10px] font-semibold text-gray-400 dark:text-gray-500 pointer-events-none whitespace-nowrap"
          >
            {year}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div
        className="relative rounded-xl overflow-hidden bg-[#f9f9fb] dark:bg-[#111113] border border-black/[0.04] dark:border-white/[0.05]"
        style={{ height: CHART_H + 16, padding: "8px 0" }}
      >
        {/* Grid lines */}
        {allYears.map((year) => (
          <div
            key={year}
            style={{ left: `${toPercent(new Date(year, 0).getTime())}%` }}
            className="absolute inset-y-0 w-px bg-black/[0.05] dark:bg-white/[0.06]"
          />
        ))}

        {/* Today indicator */}
        <div
          style={{ left: "100%" }}
          className="absolute inset-y-0 w-0.5 bg-indigo-500/30 dark:bg-indigo-400/30 z-10"
        />

        {/* Bars */}
        {bars.map((bar, i) => {
          const left = toPercent(bar.startMs);
          const width = Math.max(toPercent(bar.endMs) - left, 0.4);
          const top = bar.row * (ROW_H + ROW_GAP) + 8;
          const colors = companyColors(bar.company, isDark);
          const dur = durationStr(bar.startMs, bar.endMs);

          return (
            <MuiTooltip
              key={i}
              title={
                <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700 }}>{bar.title}</div>
                  <div>{bar.company}{bar.location ? ` · ${bar.location}` : ""}</div>
                  <div style={{ color: "#aaa", marginTop: 2 }}>
                    {bar.startDate ?? ""} – {bar.current ? "Present" : (bar.endDate ?? "")} · {dur}
                  </div>
                </div>
              }
              placement="top"
              arrow
            >
              <div
                style={{
                  position: "absolute",
                  top,
                  left: `${left}%`,
                  width: `${width}%`,
                  height: ROW_H,
                  borderRadius: ROW_H / 2,
                  background: colors.bar,
                  border: `1.5px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  paddingRight: 4,
                  overflow: "hidden",
                  cursor: "default",
                  minWidth: 6,
                  zIndex: 5,
                  transition: "opacity 0.15s ease",
                }}
                className="hover:opacity-75"
              >
                {width > 5 && (
                  <span
                    style={{
                      color: colors.text,
                      fontSize: 9,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1,
                    }}
                  >
                    {bar.company}
                  </span>
                )}
              </div>
            </MuiTooltip>
          );
        })}
      </div>
    </div>
  );
}

// ─── ExperienceCard ────────────────────────────────────────────────────────────

function ExperienceCard({ exp }: { exp: ExpEntry }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const colors = companyColors(exp.company ?? "", isDark);
  const [expanded, setExpanded] = useState(false);
  const bullets = exp.bullets ?? [];
  const MAX = 3;
  const visible = expanded ? bullets : bullets.slice(0, MAX);

  const startD = parseResumeDate(exp.startDate);
  const endD = exp.current ? new Date() : parseResumeDate(exp.endDate);
  const dur = startD && endD ? durationStr(startD.getTime(), endD.getTime()) : null;

  return (
    <div
      className="rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#1c1c1e] overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: colors.border }}
    >
      <div className="px-4 pt-3.5 pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white leading-snug">
              {exp.title ?? "Role"}
            </p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: colors.text }}>
              {exp.company ?? "Company"}
              {exp.location && (
                <span className="text-gray-400 dark:text-gray-500 font-normal"> · {exp.location}</span>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right flex flex-col items-end gap-1">
            {exp.current && (
              <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 uppercase tracking-wide">
                Current
              </span>
            )}
            <p className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {exp.startDate ?? ""}
              {exp.current ? " – Present" : exp.endDate ? ` – ${exp.endDate}` : ""}
            </p>
            {dur && (
              <span
                className="text-[9px] font-semibold rounded-full px-1.5 py-0.5 whitespace-nowrap"
                style={{ background: colors.bar, color: colors.text, border: `1px solid ${colors.border}` }}
              >
                {dur}
              </span>
            )}
          </div>
        </div>
      </div>

      {bullets.length > 0 && (
        <div className="px-4 pb-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
          <ul className="space-y-1.5">
            {visible.map((b, bi) => (
              <li key={bi} className="flex gap-2 items-start">
                <span
                  className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: colors.border }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
          {bullets.length > MAX && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {expanded ? "▲ Show less" : `▼ +${bullets.length - MAX} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ProfileCompletion ────────────────────────────────────────────────────────

function ProfileCompletion({ user }: { user: UserType | null }) {
  if (!user) return null;
  const checks = [
    { label: "Name", done: !!user.name },
    { label: "Phone", done: !!user.phone },
    { label: "Location", done: !!user.location },
    { label: "Job title", done: !!user.title },
    { label: "Summary", done: !!user.summary },
    { label: "Experience", done: (user.experienceYears ?? 0) > 0 },
    { label: "Target roles", done: (user.targetRoles?.length ?? 0) > 0 },
    { label: "LinkedIn", done: !!user.linkedinUrl },
    { label: "GitHub", done: !!user.githubUrl },
  ];
  const completed = checks.filter((c) => c.done).length;
  const pct = Math.round((completed / checks.length) * 100);
  const color = pct >= 85 ? "bg-green-500" : pct >= 50 ? "bg-indigo-500" : "bg-amber-500";

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.07] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white">Profile Completion</p>
        <span className={`text-sm font-black ${pct >= 85 ? "text-green-600" : pct >= 50 ? "text-indigo-600" : "text-amber-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-xs flex items-center gap-1 font-medium ${c.done ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-600"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${c.done ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── GitHubRepo type ──────────────────────────────────────────────────────────

interface GitHubRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  topics?: string[];
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    location: user?.location ?? "",
    title: user?.title ?? "",
    summary: user?.summary ?? "",
    experienceYears: String(user?.experienceYears ?? ""),
    targetRoles: (user?.targetRoles ?? []).join(", "),
    linkedinUrl: user?.linkedinUrl ?? "",
    githubUrl: user?.githubUrl ?? "",
    portfolioUrl: user?.portfolioUrl ?? "",
  });

  const { data: resumes } = useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const r = await api.get("/resumes");
      return Array.isArray(r.data) ? r.data : (r.data?.content ?? []);
    },
  });

  const primaryResume = resumes?.find((r) => r.isPrimary) ?? resumes?.[0];

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.put("/users/profile", data);
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data);
      setEditing(false);
      setSaved(true);
      toast.success("Profile saved successfully!");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Failed to save profile. Please try again."),
  });

  const handleSave = () => {
    const payload: Record<string, unknown> = { ...form };
    const exp = parseInt(form.experienceYears, 10);
    payload.experienceYears = isNaN(exp) ? 0 : exp;
    payload.targetRoles = form.targetRoles.split(",").map((s) => s.trim()).filter(Boolean);
    updateMutation.mutate(payload);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  // Skills
  const skillsGrouped: Record<string, string[]> = useMemo(() => {
    const us = user?.skills;
    if (us && !Array.isArray(us) && typeof us === "object") {
      const result: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(us as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length > 0)
          result[k] = (v as unknown[]).filter(Boolean).map(String);
      }
      if (Object.keys(result).length > 0) return result;
    }
    if (Array.isArray(us) && (us as string[]).length > 0) return { Skills: us as string[] };
    const ps = primaryResume?.parsedData?.skills;
    if (ps && typeof ps === "object" && !Array.isArray(ps)) {
      const result: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(ps as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length > 0)
          result[k] = (v as unknown[]).filter(Boolean).map(String);
      }
      if (Object.keys(result).length > 0) return result;
    }
    return {};
  }, [user?.skills, primaryResume?.parsedData?.skills]);

  // GitHub
  const githubUsername = (() => {
    const url = user?.githubUrl;
    if (!url) return null;
    const match = url.match(/github\.com\/([^/?#]+)/);
    return match ? match[1] : null;
  })();

  const [showAllRepos, setShowAllRepos] = useState(false);

  const CATEGORY_PALETTES = [
    { label: "text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
    { label: "text-violet-600 dark:text-violet-400", badge: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
    { label: "text-sky-600 dark:text-sky-400", badge: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" },
    { label: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
    { label: "text-amber-600 dark:text-amber-400", badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
    { label: "text-rose-600 dark:text-rose-400", badge: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" },
    { label: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300" },
    { label: "text-orange-600 dark:text-orange-400", badge: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  ];

  const repoTagStyle = (tag: string): React.CSSProperties => {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const sat = 55 + (h % 30);
    return isDark
      ? { backgroundColor: `hsl(${hue},${sat}%,16%)`, color: `hsl(${hue},${sat}%,78%)`, border: `1px solid hsl(${hue},${sat}%,28%)` }
      : { backgroundColor: `hsl(${hue},${sat}%,92%)`, color: `hsl(${hue},${sat}%,26%)`, border: `1px solid hsl(${hue},${sat}%,72%)` };
  };

  const { data: githubRepos, isLoading: loadingRepos } = useQuery({
    queryKey: ["github-repos", githubUsername],
    enabled: !!githubUsername,
    queryFn: async () => {
      const res = await fetch(
        `https://api.github.com/users/${githubUsername}/repos?sort=stars&direction=desc&per_page=100`,
        { headers: { Accept: "application/vnd.github.mercy-preview+json" } }
      );
      if (!res.ok) throw new Error("Failed to fetch repos");
      return res.json() as Promise<GitHubRepo[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const experiences = primaryResume?.parsedData?.experience ?? [];
  const certifications = primaryResume?.parsedData?.certifications ?? [];
  const projects = primaryResume?.parsedData?.projects ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ProfileCompletion user={user} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">My Profile</h1>
          <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">
            Consolidated view of your professional identity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" /> Saved
            </span>
          )}
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} loading={updateMutation.isPending}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Personal Information</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" {...field("name")} />
                <Input label="Email" value={user?.email ?? ""} disabled className="bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" placeholder="+91 98765 43210" {...field("phone")} />
                <Input label="Location" placeholder="Mumbai, India" {...field("location")} />
              </div>
              <Input label="Job Title" placeholder="Senior Software Engineer" {...field("title")} />
              <div>
                <label className="block text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-1.5">
                  Professional Summary
                </label>
                <textarea
                  className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-black dark:text-white px-3 py-2 text-sm font-medium nb-input-focus"
                  rows={4}
                  placeholder="A brief summary of your experience and career goals..."
                  {...field("summary")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Years of Experience" type="number" min="0" max="50" placeholder="e.g. 5" {...field("experienceYears")} />
                <Input label="Target Roles" placeholder="e.g. Software Engineer, Backend Developer" {...field("targetRoles")} />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <InfoRow label="Name" value={user?.name} />
                <InfoRow label="Email" value={user?.email} />
                <InfoRow label="Phone" value={user?.phone} />
                <InfoRow label="Location" value={user?.location} />
                <InfoRow label="Title" value={user?.title} />
                <InfoRow label="Experience" value={(user?.experienceYears ?? 0) > 0 ? `${user!.experienceYears} years` : undefined} />
                <InfoRow label="Member since" value={user?.createdAt ? formatDate(user.createdAt) : undefined} />
              </div>
              {user?.summary && (
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.07]">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Summary</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{user.summary}</p>
                </div>
              )}
              {user?.targetRoles && user.targetRoles.length > 0 && (
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.07]">
                  <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-2">Target Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.targetRoles.map((role) => (
                      <span key={role} className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 text-xs font-medium">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Profiles */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Connected Profiles</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-[#0077B5] shrink-0" />
                <Input placeholder="https://linkedin.com/in/yourprofile" {...field("linkedinUrl")} className="flex-1" />
              </div>
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-gray-800 shrink-0" />
                <Input placeholder="https://github.com/yourusername" {...field("githubUrl")} className="flex-1" />
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-green-600 shrink-0" />
                <Input placeholder="https://yourportfolio.com" {...field("portfolioUrl")} className="flex-1" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <ProfileLink icon={<Link2 className="h-5 w-5 text-[#0077B5]" />} label="LinkedIn" url={user?.linkedinUrl} />
              <ProfileLink icon={<GitBranch className="h-5 w-5 text-gray-800" />} label="GitHub" url={user?.githubUrl} />
              <ProfileLink icon={<Globe className="h-5 w-5 text-green-600" />} label="Portfolio" url={user?.portfolioUrl} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* GitHub Projects */}
      {githubUsername && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitHubIcon sx={{ fontSize: 19 }} className="text-gray-800 dark:text-gray-300" />
                <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">GitHub Projects</h2>
                {githubRepos && (
                  <span className="text-xs text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                    {githubRepos.filter((r) => !r.fork).length} repos
                  </span>
                )}
              </div>
              <a
                href={`https://github.com/${githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#86868b] dark:text-[#8e8e93] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                View all <OpenInNewRoundedIcon sx={{ fontSize: 12 }} />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRepos ? (
              <p className="text-sm text-gray-400">Loading repositories…</p>
            ) : githubRepos && githubRepos.length > 0 ? (() => {
              const ownRepos = githubRepos.filter((r) => !r.fork);
              const visible = showAllRepos ? ownRepos : ownRepos.slice(0, 6);
              return (
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                  {visible.map((repo) => {
                    const langTag = repo.language ?? null;
                    const topics = repo.topics ?? [];
                    const topicsLower = new Set(topics.map((t) => t.toLowerCase()));
                    const allTechs = [...topics, ...(langTag && !topicsLower.has(langTag.toLowerCase()) ? [langTag] : [])];
                    return (
                      <div key={repo.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <FolderOpenRoundedIcon sx={{ fontSize: 15 }} className="text-[#86868b] dark:text-[#8e8e93] shrink-0" />
                              <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline text-sm truncate">
                                {repo.name}
                              </a>
                              <OpenInNewRoundedIcon sx={{ fontSize: 11 }} className="text-[#86868b] dark:text-[#8e8e93] opacity-50 shrink-0" />
                            </div>
                            {repo.description && (
                              <p className="text-xs text-[#86868b] dark:text-[#8e8e93] line-clamp-1 mb-1.5 ml-5">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 ml-5">
                              {repo.stargazers_count > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] text-[#86868b] dark:text-[#8e8e93] font-medium">
                                  <StarRoundedIcon sx={{ fontSize: 13 }} className="text-amber-400" />
                                  {repo.stargazers_count}
                                </span>
                              )}
                              {repo.forks_count > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] text-[#86868b] dark:text-[#8e8e93] font-medium">
                                  <CallSplitRoundedIcon sx={{ fontSize: 13 }} className="text-indigo-400" />
                                  {repo.forks_count}
                                </span>
                              )}
                            </div>
                          </div>
                          {allTechs.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-1 shrink-0 max-w-[58%]">
                              {allTechs.map((t) => (
                                <span key={t} style={repoTagStyle(t.toLowerCase())}
                                  className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                                  {toCamelCase(t)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#86868b] dark:text-[#8e8e93] italic shrink-0">no topics set</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {ownRepos.length > 6 && (
                    <button
                      onClick={() => setShowAllRepos((v) => !v)}
                      className="pt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {showAllRepos ? "Show less" : `Show ${ownRepos.length - 6} more repositories`}
                    </button>
                  )}
                </div>
              );
            })() : (
              <p className="text-sm text-gray-400">No public repositories found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Skills</h2>
            {Object.keys(skillsGrouped).length > 0 && (
              <span className="text-xs text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                {Object.values(skillsGrouped).flat().length} skills
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(skillsGrouped).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(skillsGrouped).map(([category, skills], idx) => {
                const palette = CATEGORY_PALETTES[idx % CATEGORY_PALETTES.length];
                return (
                  <div key={category} className="flex gap-3 items-start">
                    <span className={`text-xs font-semibold w-28 shrink-0 pt-0.5 capitalize ${palette.label}`}>
                      {category}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <span key={skill} style={repoTagStyle(skill.toLowerCase())}
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
                          {toCamelCase(skill)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-400 dark:text-[#8b949e]">
              Upload a resume to auto-detect your skills.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Primary Resume metadata */}
      {primaryResume && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Primary Resume</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">{primaryResume.filename}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e] mt-0.5">
                  Uploaded {formatDate(primaryResume.createdAt)}
                  {primaryResume.fileSize && ` · ${(primaryResume.fileSize / 1024).toFixed(0)} KB`}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(primaryResume.parsedData?.experience?.length ?? 0) > 0 && (
                    <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">✓ Experience</span>
                  )}
                  {(primaryResume.parsedData?.education?.length ?? 0) > 0 && (
                    <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">✓ Education</span>
                  )}
                  {(primaryResume.parsedData?.projects?.length ?? 0) > 0 && (
                    <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">✓ Projects</span>
                  )}
                  {(primaryResume.parsedData?.certifications?.length ?? 0) > 0 && (
                    <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">✓ Certifications</span>
                  )}
                  {primaryResume.parsedData?.wordCount && (
                    <span className="text-[10px] font-bold text-gray-500 dark:text-[#8b949e]">{primaryResume.parsedData.wordCount} words</span>
                  )}
                </div>
              </div>
              <Badge className="bg-amber-100 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-400 border-amber-400 dark:border-yellow-600">Primary</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Experience */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Work Experience</h2>
            {experiences.length > 0 && (
              <span className="text-xs text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                {experiences.length}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {experiences.length > 0 ? (
            <>
              {/* Timeline */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] dark:text-[#8e8e93] mb-3">
                  Career Timeline
                </p>
                <ExperienceTimeline experiences={experiences} />
              </div>

              {/* Cards grid */}
              <div className="border-t border-black/[0.06] dark:border-white/[0.07] pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {experiences.map((exp, i) => (
                    <ExperienceCard key={i} exp={exp} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-400 dark:text-[#8b949e]">
              Upload a resume to auto-detect your work experience.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Education</h2>
            {(primaryResume?.parsedData?.education?.length ?? 0) > 0 && (
              <span className="text-xs text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                {primaryResume!.parsedData!.education!.length}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(primaryResume?.parsedData?.education?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {primaryResume!.parsedData!.education!.map((edu, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-[#f9f9fb] dark:bg-[#1c1c1e]"
                  style={{ borderLeftWidth: 3, borderLeftColor: `hsl(${(i * 67 + 210) % 360}, 65%, ${isDark ? '38%' : '68%'})` }}
                >
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white leading-snug">
                    {edu.institution ?? "Institution"}
                  </p>
                  {(edu.degree || edu.field) && (
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {[edu.degree, edu.field].filter(Boolean).join(" in ")}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {edu.graduationDate && (
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                        {edu.graduationDate}
                      </span>
                    )}
                    {edu.gpa && (
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                        GPA {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-400 dark:text-[#8b949e]">
              Upload a resume to auto-detect your education history.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Certifications & Achievements */}
      {certifications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                Certifications & Achievements
              </h2>
              <span className="text-xs text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                {certifications.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certifications.map((cert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-[#f9f9fb] dark:bg-[#1c1c1e]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <Trophy className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white leading-snug">
                      {cert.name}
                    </p>
                    {cert.issuer && (
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {cert.issuer}
                      </p>
                    )}
                    {cert.date && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 bg-[#f2f2f7] dark:bg-[#2c2c2e] inline-block rounded-full px-2 py-0.5">
                        {cert.date}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resume Projects */}
      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Resume Projects</h2>
              <span className="text-xs text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                {projects.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((proj, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#1c1c1e]"
                  style={{ borderLeftWidth: 3, borderLeftColor: `hsl(${(i * 83 + 255) % 360}, 60%, ${isDark ? '38%' : '65%'})` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white leading-snug">
                      {proj.name}
                    </p>
                    {proj.url && (
                      <a
                        href={proj.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mt-0.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 leading-relaxed line-clamp-3">
                      {proj.description}
                    </p>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {proj.technologies.map((t) => (
                        <span
                          key={t}
                          style={repoTagStyle(t.toLowerCase())}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                        >
                          {toCamelCase(t)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
        {value || <span className="text-gray-400 dark:text-gray-600 font-normal italic">Not set</span>}
      </p>
    </div>
  );
}

function ProfileLink({ icon, label, url }: { icon: React.ReactNode; label: string; url?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1c1e]">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">{label}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
          >
            <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600 italic font-medium">Not connected</p>
        )}
      </div>
    </div>
  );
}
