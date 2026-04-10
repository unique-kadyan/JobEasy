"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useJobSearch } from "@/hooks/useJobs";
import { useResumeSkills } from "@/hooks/useResumes";
import { useApply } from "@/hooks/useApplications";
import { useGenerateCoverLetter } from "@/hooks/useCoverLetters";
import JobCard from "@/components/jobs/JobCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import UpgradeModal from "@/components/subscription/UpgradeModal";
import { Search, Loader2, Sparkles, X, ChevronLeft, ChevronRight, Lock, Zap, Briefcase } from "lucide-react";
import type { Job } from "@/types";
import { AI_PROVIDERS } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";

const PAGE_SIZE_OPTIONS = [
  { value: "30", label: "30 per page" },
  { value: "40", label: "40 per page" },
  { value: "50", label: "50 per page" },
  { value: "75", label: "75 per page" },
  { value: "100", label: "100 per page" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "REMOTEOK",       label: "🆓 Remote OK" },
  { value: "REMOTIVE",       label: "🆓 Remotive" },
  { value: "ARBEITNOW",      label: "🆓 Arbeitnow" },
  { value: "JOBICY",         label: "🆓 Jobicy" },
  { value: "FINDWORK",       label: "🆓 FindWork" },
  { value: "HIMALAYAS",      label: "🆓 Himalayas" },
  { value: "THE_MUSE",       label: "🆓 The Muse" },
  { value: "WORKINGNOMADS",  label: "🆓 Working Nomads" },
  { value: "WEWORKREMOTELY", label: "🆓 We Work Remotely" },
  { value: "DEVITJOBS",      label: "🆓 DevITJobs" },
  { value: "REMOTECO",       label: "🆓 Remote.co" },
  { value: "JOBSPRESSO",     label: "🆓 Jobspresso" },
  { value: "ADZUNA",         label: "🔑 Adzuna" },
  { value: "CAREERJET",      label: "🔑 CareerJet" },
  { value: "REED",           label: "🔑 Reed UK" },
  { value: "JOOBLE",         label: "🔑 Jooble" },
  { value: "USAJOBS",        label: "🔑 USA Jobs" },
  { value: "JSEARCH",        label: "💳 JSearch (Indeed+LinkedIn)" },
  { value: "SERPAPI",        label: "💳 SerpAPI (Google Jobs)" },
];

export default function JobsPage() {
  const resumeSkills = useResumeSkills();
  const { canSeeAllJobs, canAutoApply } = useAuthStore();

  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(30);
  const [skillTags, setSkillTags] = useState<string[]>([]);

  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; targetTier?: "JOBS" | "AUTO_APPLY" }>({ open: false });
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const computedLocations = (() => {
    const locs: string[] = [];
    if (isRemote) locs.push("Remote");
    if (locationText.trim()) locs.push(locationText.trim());
    return locs;
  })();

  useEffect(() => {
    if (resumeSkills.length > 0 && skillTags.length === 0 && !searchQuery) {
      setSkillTags(resumeSkills.slice(0, 10));
    }
  }, [resumeSkills, skillTags.length, searchQuery]);

  const { data: pagedJobs, isLoading } = useJobSearch(
    searchQuery,
    computedLocations,
    source || undefined,
    page,
    size
  );

  const jobs = pagedJobs?.content ?? [];
  const totalElements = pagedJobs?.totalElements ?? 0;
  const totalPages = pagedJobs?.totalPages ?? 0;
  const showPagination = totalElements > 30;

  const applyMutation = useApply();
  const generateMutation = useGenerateCoverLetter();

  const [applyModal, setApplyModal] = useState<Job | null>(null);
  const [aiProvider, setAiProvider] = useState("OPENAI");
  const [applying, setApplying] = useState(false);

  const buildSearchQuery = () => {
    const parts: string[] = [];
    if (query.trim()) parts.push(query.trim());
    if (skillTags.length > 0) parts.push(skillTags.join(" "));
    return parts.join(" ");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = buildSearchQuery();
    if (q) {
      setSearchQuery(q);
      setPage(0);
    }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSize(Number(e.target.value));
    setPage(0);
  };

  const removeSkill = (skill: string) => {
    setSkillTags(skillTags.filter((s) => s !== skill));
  };

  const addSkill = (skill: string) => {
    if (skill && !skillTags.includes(skill)) {
      setSkillTags([...skillTags, skill]);
    }
  };

  const handleQuickApply = (job: Job) => {
    if (!canSeeAllJobs()) {
      setUpgradeModal({ open: true, targetTier: "JOBS" });
      return;
    }
    setApplyModal(job);
  };

  const toggleJobSelect = (jobId: string) => {
    if (!canAutoApply()) {
      setUpgradeModal({ open: true, targetTier: "AUTO_APPLY" });
      return;
    }
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleBulkApply = async () => {
    if (selectedJobs.size === 0) return;
    if (!canAutoApply()) {
      setUpgradeModal({ open: true, targetTier: "AUTO_APPLY" });
      return;
    }
    setBulkApplying(true);
    setBulkResult(null);
    try {
      await api.post("/auto-apply/queue", { jobIds: Array.from(selectedJobs) });
      setBulkResult(`${selectedJobs.size} job(s) added to your auto-apply queue!`);
      setSelectedJobs(new Set());
    } catch {
      setBulkResult("Failed to queue jobs. Please try again.");
    } finally {
      setBulkApplying(false);
    }
  };

  const confirmApply = async () => {
    if (!applyModal) return;
    setApplying(true);
    try {
      const coverLetter = await generateMutation.mutateAsync({
        jobId: applyModal.id,
        provider: aiProvider,
      });
      await applyMutation.mutateAsync({
        jobId: applyModal.id,
        coverLetterId: coverLetter.id,
      });
      setApplyModal(null);
    } catch (err) {
      console.error("Apply failed:", err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
        <p className="text-gray-500">
          Search across Indeed, LinkedIn, Arbeitnow, CareerJet and more
        </p>
      </div>

      <Card>
        <CardContent className="py-4 space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[250px]">
                <Input
                  placeholder="Job title, keywords, or company"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  label="Keywords"
                />
              </div>
              <div className="w-44">
                <Select
                  label="Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  options={SOURCE_OPTIONS}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" loading={isLoading}>
                  <Search className="h-4 w-4" /> Search Jobs
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Remote Only</span>
              </label>
              <div className="flex-1 min-w-[220px]">
                <Input
                  label="Country / City"
                  placeholder="e.g. India, United States, Bangalore..."
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Skills from Resume
                </label>
                {resumeSkills.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-indigo-600">
                    <Sparkles className="h-3 w-3" /> Auto-detected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {skillTags.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-sm font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-indigo-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <AddSkillInline onAdd={addSkill} />
              </div>
              {resumeSkills.length > 0 &&
                skillTags.length < resumeSkills.length && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">
                      More skills from your resume:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {resumeSkills
                        .filter((s) => !skillTags.includes(s))
                        .map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => addSkill(skill)}
                            className="rounded-full border border-dashed border-gray-300 text-gray-500 px-2.5 py-0.5 text-xs hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                          >
                            + {skill}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          </form>
        </CardContent>
      </Card>

      <UpgradeModal
        open={upgradeModal.open}
        targetTier={upgradeModal.targetTier}
        onClose={() => setUpgradeModal({ open: false })}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-500">Searching jobs...</span>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                {!canSeeAllJobs() && searchQuery
                  ? `Showing 2 of many results (free plan)`
                  : totalElements > 0
                  ? `${totalElements.toLocaleString()} jobs found`
                  : `${jobs.length} jobs found`}
                {canSeeAllJobs() && totalPages > 1 && (
                  <span className="text-gray-400">
                    {" "}· page {page + 1} of {totalPages}
                  </span>
                )}
              </p>
              {computedLocations.length > 0 && (
                <div className="flex items-center gap-1">
                  {computedLocations.map((loc) => (
                    <Badge key={loc} className="bg-gray-100 text-gray-600 text-xs">
                      {loc}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canAutoApply() && selectedJobs.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkApply}
                  loading={bulkApplying}
                >
                  <Zap className="h-4 w-4" />
                  Auto Apply {selectedJobs.size} Job{selectedJobs.size > 1 ? "s" : ""}
                </Button>
              )}
              {canSeeAllJobs() && showPagination && (
                <Select
                  value={String(size)}
                  onChange={handleSizeChange}
                  options={PAGE_SIZE_OPTIONS}
                />
              )}
            </div>
          </div>

          {bulkResult && (
            <div className={`text-sm px-4 py-2 rounded-lg ${bulkResult.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {bulkResult}
            </div>
          )}

          {jobs.map((job, i) => (
            <div key={job.id || i} className="relative">
              {canAutoApply() && (
                <input
                  type="checkbox"
                  checked={selectedJobs.has(job.id)}
                  onChange={() => toggleJobSelect(job.id)}
                  className="absolute top-4 left-4 z-10 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  title="Select for auto-apply"
                />
              )}
              <div className={canAutoApply() ? "pl-8" : ""}>
                <JobCard job={job} onApply={handleQuickApply} />
              </div>
            </div>
          ))}

          {!canSeeAllJobs() && searchQuery && (
            <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6 text-center space-y-3">
              <Lock className="h-8 w-8 text-indigo-400 mx-auto" />
              <h3 className="font-semibold text-gray-900">Unlock All Job Results</h3>
              <p className="text-sm text-gray-500">
                You&apos;re seeing 2 of many matching jobs. Upgrade to see all results and apply faster.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => setUpgradeModal({ open: true, targetTier: "JOBS" })}>
                  <Briefcase className="h-4 w-4" /> All Jobs — ₹299/mo
                </Button>
                <Button variant="outline" onClick={() => setUpgradeModal({ open: true, targetTier: "AUTO_APPLY" })}>
                  <Zap className="h-4 w-4" /> Auto Apply — ₹599/mo
                </Button>
              </div>
            </div>
          )}

          {canSeeAllJobs() && showPagination && (
            <div className="flex items-center justify-center gap-1 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(0)}
                title="First page"
              >
                «
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1 mx-2">
                {buildPageRange(page, totalPages).map((p) =>
                  p === "…" ? (
                    <span key={p} className="px-2 text-gray-400 select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(Number(p) - 1)}
                      className={`min-w-[2rem] h-8 rounded px-2 text-sm font-medium transition-colors ${
                        Number(p) - 1 === page
                          ? "bg-indigo-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
                title="Last page"
              >
                »
              </Button>
            </div>
          )}
        </div>
      )}

      {searchQuery && !isLoading && jobs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No jobs found. Try different skills or locations.
        </div>
      )}

      {!searchQuery && (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Search for jobs
          </h3>
          <p className="text-gray-500 mb-2">
            {resumeSkills.length > 0
              ? "Your resume skills are loaded. Set your location and hit Search!"
              : "Upload a resume first to auto-detect your skills, or enter keywords manually."}
          </p>
        </div>
      )}

      <Modal
        open={!!applyModal}
        onClose={() => setApplyModal(null)}
        title="Quick Apply"
      >
        {applyModal && (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900">{applyModal.title}</p>
              <p className="text-sm text-gray-500">{applyModal.company}</p>
            </div>
            <Select
              label="AI Provider for Cover Letter"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              options={AI_PROVIDERS}
            />
            <p className="text-sm text-gray-500">
              A customized cover letter will be generated using AI and attached
              to your application.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setApplyModal(null)}>
                Cancel
              </Button>
              <Button onClick={confirmApply} loading={applying}>
                Generate & Apply
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [];
  const add = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };
  add(1);
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current); i <= Math.min(total - 1, current + 2); i++) add(i);
  if (current < total - 3) pages.push("…");
  add(total);
  return pages;
}

function AddSkillInline({ onAdd }: { onAdd: (skill: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="rounded-full border border-dashed border-gray-300 text-gray-400 px-3 py-1 text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors"
      >
        + Add skill
      </button>
    );
  }

  return (
    <input
      autoFocus
      className="rounded-full border border-indigo-300 px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-indigo-500 w-32"
      placeholder="e.g. React"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (value.trim()) {
            onAdd(value.trim().toLowerCase());
            setValue("");
          }
        }
        if (e.key === "Escape") {
          setAdding(false);
          setValue("");
        }
      }}
      onBlur={() => {
        if (value.trim()) onAdd(value.trim().toLowerCase());
        setAdding(false);
        setValue("");
      }}
    />
  );
}
