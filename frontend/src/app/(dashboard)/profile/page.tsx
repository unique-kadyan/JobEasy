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
    <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900">Profile Completion</p>
          <span className={`text-sm font-bold ${pct >= 85 ? "text-green-600" : pct >= 50 ? "text-indigo-600" : "text-amber-600"}`}>
            {pct}%
          </span>
        </div>
        <div className="h-2 w-full bg-white/70 rounded-full overflow-hidden border border-white/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-xs flex items-center gap-1 ${c.done ? "text-green-600" : "text-gray-400"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.done ? "bg-green-500" : "bg-gray-300"}`} />
              {c.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
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
    linkedinUrl: user?.linkedinUrl ?? "",
    githubUrl: user?.githubUrl ?? "",
    portfolioUrl: user?.portfolioUrl ?? "",
  });

  const { data: resumes } = useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => (await api.get("/resumes")).data,
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

  const handleSave = () => updateMutation.mutate(form);

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

  const parsedSkills = primaryResume?.parsedData?.skills ?? [];

  const githubUsername = (() => {
    const url = user?.githubUrl;
    if (!url) return null;
    const match = url.match(/github\.com\/([^/?#]+)/);
    return match ? match[1] : null;
  })();

  const { data: githubRepos, isLoading: loadingRepos } = useQuery({
    queryKey: ["github-repos", githubUsername],
    enabled: !!githubUsername,
    queryFn: async () => {
      const res = await fetch(
        `https://api.github.com/users/${githubUsername}/repos?sort=stars&direction=desc&per_page=100`
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
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500">
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
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Summary
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  rows={4}
                  placeholder="A brief summary of your experience and career goals..."
                  {...field("summary")}
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
                <InfoRow label="Member since" value={user?.createdAt ? formatDate(user.createdAt) : undefined} />
              </div>
              {user?.summary && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Summary</p>
                  <p className="text-sm text-gray-700">{user.summary}</p>
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
            <h2 className="font-semibold text-gray-900">Connected Profiles</h2>
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
                <GitBranch className="h-5 w-5 text-gray-800" />
                <h2 className="font-semibold text-gray-900">GitHub Projects</h2>
              </div>
              <a
                href={user?.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                View all <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRepos ? (
              <p className="text-sm text-gray-400">Loading repositories…</p>
            ) : githubRepos && githubRepos.length > 0 ? (
              <div className="space-y-3">
                {githubRepos.filter((r) => !r.fork).slice(0, 3).map((repo) => (
                  <div key={repo.id} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        {repo.name}
                      </a>
                      {repo.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {repo.language && (
                          <span className="text-xs text-gray-400">{repo.language}</span>
                        )}
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Star className="h-3 w-3" /> {repo.stargazers_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No public repositories found.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Skills</h2>
          </div>
        </CardHeader>
        <CardContent>
          {parsedSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Detected from resume
              </p>
              <div className="flex flex-wrap gap-2">
                {(parsedSkills as string[]).map((skill) => (
                  <Badge key={skill} className="bg-indigo-50 text-indigo-700">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {displaySkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Profile skills
              </p>
              <div className="flex flex-wrap gap-2">
                {displaySkills.map((skill) => (
                  <Badge key={skill} className="bg-gray-100 text-gray-700">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {parsedSkills.length === 0 && displaySkills.length === 0 && (
            <p className="text-sm text-gray-400">
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
              <h2 className="font-semibold text-gray-900">Primary Resume</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{primaryResume.filename}</p>
                <p className="text-sm text-gray-500">
                  Uploaded {formatDate(primaryResume.createdAt)}
                  {primaryResume.fileSize &&
                    ` · ${(primaryResume.fileSize / 1024).toFixed(0)} KB`}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  {primaryResume.parsedData?.hasExperience && <span>✓ Experience</span>}
                  {primaryResume.parsedData?.hasEducation && <span>✓ Education</span>}
                  {primaryResume.parsedData?.hasProjects && <span>✓ Projects</span>}
                  {primaryResume.parsedData?.wordCount && (
                    <span>{primaryResume.parsedData.wordCount as number} words</span>
                  )}
                </div>
              </div>
              <Badge className="bg-yellow-100 text-yellow-700">Primary</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Education</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Education details are extracted from your resume. Use{" "}
            <a href="/smart-resume" className="text-indigo-600 hover:underline">
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
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-800 font-medium">{value || <span className="text-gray-300 font-normal">Not set</span>}</p>
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
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
          >
            {url.replace(/^https?:\/\//, "")}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-sm text-gray-400 italic">Not connected</p>
        )}
      </div>
    </div>
  );
}
