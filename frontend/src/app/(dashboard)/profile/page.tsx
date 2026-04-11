"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
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
  Star,
} from "lucide-react";
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
    <div className="bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-4" style={{ boxShadow: "3px 3px 0 #000" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-black text-black dark:text-white uppercase tracking-wide">Profile Completion</p>
        <span className={`text-sm font-black ${pct >= 85 ? "text-green-600" : pct >= 50 ? "text-indigo-600" : "text-amber-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full bg-gray-100 dark:bg-[#21262d] rounded-[2px] overflow-hidden border border-black dark:border-[#30363d]">
        <div
          className={`h-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-xs flex items-center gap-1 font-bold ${c.done ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-600"}`}
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

  const displaySkills = (() => {
    const skills = user?.skills;
    if (!skills) return [];
    if (Array.isArray(skills)) return skills as string[];
    return Object.values(skills).flat() as string[];
  })();

  const parsedSkills: string[] = (() => {
    const s = primaryResume?.parsedData?.skills;
    if (!s) return [];
    return Object.values(s).flat().filter(Boolean) as string[];
  })();

  const githubUsername = (() => {
    const url = user?.githubUrl;
    if (!url) return null;
    const match = url.match(/github\.com\/([^/?#]+)/);
    return match ? match[1] : null;
  })();

  const [showAllRepos, setShowAllRepos] = useState(false);

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
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">My Profile</h1>
          <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">
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
            <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Personal Information</h2>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Professional Summary
                </label>
                <textarea
                  className="block w-full rounded-[4px] border-2 border-black dark:border-[#30363d] bg-white dark:bg-[#0d1117] text-black dark:text-white px-3 py-2 text-sm font-medium nb-input-focus"
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
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Summary</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{user.summary}</p>
                </div>
              )}
              {user?.targetRoles && user.targetRoles.length > 0 && (
                <div className="pt-2 border-t-2 border-black/10 dark:border-[#30363d]">
                  <p className="text-xs font-black text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Target Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.targetRoles.map((role) => (
                      <span key={role} className="rounded-[3px] border border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 text-xs font-bold">
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
            <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Connected Profiles</h2>
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
                <GitBranch className="h-5 w-5 text-gray-800 dark:text-gray-300" />
                <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">GitHub Projects</h2>
                {githubRepos && (
                  <span className="text-xs text-gray-500 dark:text-[#8b949e] font-bold border border-gray-300 dark:border-[#30363d] rounded-[3px] px-1.5 py-0.5">
                    {githubRepos.filter((r) => !r.fork).length} repos
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRepos ? (
              <p className="text-sm text-gray-400">Loading repositories…</p>
            ) : githubRepos && githubRepos.length > 0 ? (() => {
              const ownRepos = githubRepos.filter((r) => !r.fork);
              const visible = showAllRepos ? ownRepos : ownRepos.slice(0, 6);
              return (
                <div className="space-y-0">
                  {visible.map((repo) => {
                    const techs = [
                      ...(repo.topics ?? []),
                      ...(repo.language && !repo.topics?.includes(repo.language.toLowerCase())
                        ? [repo.language]
                        : []),
                    ].slice(0, 6);
                    return (
                      <div
                        key={repo.id}
                        className="py-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-black text-indigo-600 dark:text-indigo-400 hover:underline truncate shrink-0 max-w-[40%] uppercase tracking-wide"
                          >
                            {repo.name}
                          </a>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            {techs.map((t) => (
                              <span
                                key={t}
                                className="rounded-[3px] border border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                              >
                                {t}
                              </span>
                            ))}
                            <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-[#8b949e] font-bold whitespace-nowrap ml-1">
                              <Star className="h-3 w-3" /> {repo.stargazers_count}
                            </span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {ownRepos.length > 6 && (
                    <button
                      onClick={() => setShowAllRepos((v) => !v)}
                      className="mt-3 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wide"
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
            <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Skills</h2>
          </div>
        </CardHeader>
        <CardContent>
          {parsedSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-black text-gray-500 dark:text-[#8b949e] mb-2 uppercase tracking-wide">
                Detected from resume
              </p>
              <div className="flex flex-wrap gap-2">
                {(parsedSkills as string[]).map((skill) => (
                  <Badge key={skill} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-400">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {displaySkills.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-500 dark:text-[#8b949e] mb-2 uppercase tracking-wide">
                Profile skills
              </p>
              <div className="flex flex-wrap gap-2">
                {displaySkills.map((skill) => (
                  <Badge key={skill} className="bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {parsedSkills.length === 0 && displaySkills.length === 0 && (
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
              <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Primary Resume</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-black dark:text-white text-sm uppercase tracking-wide">{primaryResume.filename}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e] mt-0.5">
                  Uploaded {formatDate(primaryResume.createdAt)}
                  {primaryResume.fileSize &&
                    ` · ${(primaryResume.fileSize / 1024).toFixed(0)} KB`}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(primaryResume.parsedData?.experience?.length ?? 0) > 0 && <span className="text-[10px] font-black text-green-700 dark:text-green-400 border border-green-400 bg-green-50 dark:bg-green-900/20 rounded-[3px] px-1.5 py-0.5">✓ Experience</span>}
                  {(primaryResume.parsedData?.education?.length ?? 0) > 0 && <span className="text-[10px] font-black text-green-700 dark:text-green-400 border border-green-400 bg-green-50 dark:bg-green-900/20 rounded-[3px] px-1.5 py-0.5">✓ Education</span>}
                  {(primaryResume.parsedData?.projects?.length ?? 0) > 0 && <span className="text-[10px] font-black text-green-700 dark:text-green-400 border border-green-400 bg-green-50 dark:bg-green-900/20 rounded-[3px] px-1.5 py-0.5">✓ Projects</span>}
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Education</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">
            Education details are extracted from your resume. Use{" "}
            <a href="/smart-resume" className="text-indigo-600 dark:text-indigo-400 font-black hover:underline">
              Smart Resume
            </a>{" "}
            to view and improve your parsed education data.
          </p>
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
  fork: boolean;
  topics?: string[];
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-black text-gray-500 dark:text-[#8b949e] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-bold text-black dark:text-white">{value || <span className="text-gray-400 dark:text-gray-600 font-normal italic">Not set</span>}</p>
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
    <div className="flex items-center gap-3 p-3 rounded-[3px] border-2 border-black/10 dark:border-[#30363d] bg-gray-50 dark:bg-[#0d1117]">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-gray-500 dark:text-[#8b949e] uppercase tracking-wide">{label}</p>
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
