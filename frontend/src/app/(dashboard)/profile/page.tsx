"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
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
} from "@/components/ui/icons";
import GitHubIcon from "@mui/icons-material/GitHub";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { formatDate } from "@/lib/utils";
import type { Resume, User as UserType } from "@/types";

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
  const total = checks.length;
  const pct = Math.round((completed / total) * 100);

  const color =
    pct >= 85
      ? "bg-green-500"
      : pct >= 50
      ? "bg-indigo-500"
      : "bg-amber-500";

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.07] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white">Profile Completion</p>
        <span className={`text-sm font-black ${pct >= 85 ? "text-green-600" : pct >= 50 ? "text-indigo-600" : "text-amber-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
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
    queryFn: async () => { const r = await api.get("/resumes"); return Array.isArray(r.data) ? r.data : (r.data?.content ?? []); },
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
    onError: () => {
      toast.error("Failed to save profile. Please try again.");
    },
  });

  const handleSave = () => {
    const payload: Record<string, unknown> = { ...form };
    const exp = parseInt(form.experienceYears, 10);
    payload.experienceYears = isNaN(exp) ? 0 : exp;
    payload.targetRoles = form.targetRoles
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateMutation.mutate(payload);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  // Preserve grouped structure: prefer user.skills grouped map, fall back to parsedData.skills
  const skillsGrouped: Record<string, string[]> = (() => {
    const us = user?.skills;
    if (us && !Array.isArray(us) && typeof us === "object") {
      const result: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(us as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length > 0)
          result[k] = (v as unknown[]).filter(Boolean).map(String);
      }
      if (Object.keys(result).length > 0) return result;
    }
    if (Array.isArray(us) && (us as string[]).length > 0)
      return { Skills: us as string[] };
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
  })();

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

  const TAG_COLORS = [
    "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
    "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
    "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
    "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
    "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  ];

  const tagColor = (tag: string) => {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
    return TAG_COLORS[h % TAG_COLORS.length];
  };

  // Generates a unique HSL colour for every tech badge — billions of possible hues
  const repoTagStyle = (tag: string): React.CSSProperties => {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const sat = 55 + (h % 30); // 55–85 %
    return isDark
      ? {
          backgroundColor: `hsl(${hue},${sat}%,16%)`,
          color: `hsl(${hue},${sat}%,78%)`,
          border: `1px solid hsl(${hue},${sat}%,28%)`,
        }
      : {
          backgroundColor: `hsl(${hue},${sat}%,92%)`,
          color: `hsl(${hue},${sat}%,26%)`,
          border: `1px solid hsl(${hue},${sat}%,72%)`,
        };
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

  return (
    <div className="max-w-4xl space-y-6">
      <ProfileCompletion user={user} />

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                loading={updateMutation.isPending}
              >
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="h-4 w-4" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

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
                <Input
                  label="Years of Experience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 5"
                  {...field("experienceYears")}
                />
                <Input
                  label="Target Roles"
                  placeholder="e.g. Software Engineer, Backend Developer"
                  {...field("targetRoles")}
                />
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
                <InfoRow
                  label="Experience"
                  value={(user?.experienceYears ?? 0) > 0 ? `${user!.experienceYears} years` : undefined}
                />
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
                <Input
                  placeholder="https://linkedin.com/in/yourprofile"
                  {...field("linkedinUrl")}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-gray-800 shrink-0" />
                <Input
                  placeholder="https://github.com/yourusername"
                  {...field("githubUrl")}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-green-600 shrink-0" />
                <Input
                  placeholder="https://yourportfolio.com"
                  {...field("portfolioUrl")}
                  className="flex-1"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <ProfileLink
                icon={<Link2 className="h-5 w-5 text-[#0077B5]" />}
                label="LinkedIn"
                url={user?.linkedinUrl}
              />
              <ProfileLink
                icon={<GitBranch className="h-5 w-5 text-gray-800" />}
                label="GitHub"
                url={user?.githubUrl}
              />
              <ProfileLink
                icon={<Globe className="h-5 w-5 text-green-600" />}
                label="Portfolio"
                url={user?.portfolioUrl}
              />
            </div>
          )}
        </CardContent>
      </Card>

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
                View all
                <OpenInNewRoundedIcon sx={{ fontSize: 12 }} />
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
                    const allTechs = [
                      ...topics,
                      ...(langTag && !topicsLower.has(langTag.toLowerCase()) ? [langTag] : []),
                    ];
                    return (
                      <div key={repo.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">

                          {/* Left: icon + name + description + stats */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <FolderOpenRoundedIcon
                                sx={{ fontSize: 15 }}
                                className="text-[#86868b] dark:text-[#8e8e93] shrink-0"
                              />
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline text-sm truncate"
                              >
                                {repo.name}
                              </a>
                              <OpenInNewRoundedIcon
                                sx={{ fontSize: 11 }}
                                className="text-[#86868b] dark:text-[#8e8e93] opacity-50 shrink-0"
                              />
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

                          {/* Right: all tech badges */}
                          {allTechs.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-1 max-w-[54%] shrink-0">
                              {allTechs.map((t) => (
                                <span
                                  key={t}
                                  style={repoTagStyle(t.toLowerCase())}
                                  className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
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
                      {showAllRepos
                        ? "Show less"
                        : `Show ${ownRepos.length - 6} more repositories`}
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
                    <span className={`text-xs font-semibold w-32 shrink-0 pt-0.5 ${palette.label}`}>
                      {category}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tagColor(skill)}`}
                        >
                          {skill}
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
                  {primaryResume.fileSize &&
                    ` · ${(primaryResume.fileSize / 1024).toFixed(0)} KB`}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(primaryResume.parsedData?.experience?.length ?? 0) > 0 && <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">✓ Experience</span>}
                  {(primaryResume.parsedData?.education?.length ?? 0) > 0 && <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">✓ Education</span>}
                  {(primaryResume.parsedData?.projects?.length ?? 0) > 0 && <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">✓ Projects</span>}
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

      {(primaryResume?.parsedData?.experience?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Work Experience</h2>
              <span className="text-xs text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full px-2 py-0.5">
                {primaryResume!.parsedData!.experience!.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {primaryResume!.parsedData!.experience!.map((exp, i) => (
                <div key={i} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                        {exp.title ?? "Role"}
                      </p>
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {exp.company ?? "Company"}
                        {exp.location && <span className="text-gray-400 dark:text-gray-500 font-normal"> · {exp.location}</span>}
                      </p>
                    </div>
                    {(exp.startDate || exp.endDate) && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
                        {exp.startDate ?? ""}{exp.endDate ? ` – ${exp.endDate}` : ""}
                      </span>
                    )}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.bullets.slice(0, 4).map((b, bi) => (
                        <li key={bi} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5">
                          <span className="text-gray-300 dark:text-gray-600 shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {primaryResume!.parsedData!.education!.map((edu, i) => (
                <div key={i} className="py-4 first:pt-0 last:pb-0">
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                    {edu.institution ?? "Institution"}
                  </p>
                  {(edu.degree || edu.field) && (
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {[edu.degree, edu.field].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {edu.graduationDate && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{edu.graduationDate}</span>
                    )}
                    {edu.gpa && (
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">GPA {edu.gpa}</span>
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
    </div>
  );
}

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

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{value || <span className="text-gray-400 dark:text-gray-600 font-normal italic">Not set</span>}</p>
    </div>
  );
}

function ProfileLink({
  icon,
  label,
  url,
}: {
  icon: React.ReactNode;
  label: string;
  url?: string;
}) {
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
            <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600 italic font-medium">Not connected</p>
        )}
      </div>
    </div>
  );
}
