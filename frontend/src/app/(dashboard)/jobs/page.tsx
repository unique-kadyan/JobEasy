"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useJobSearch, useSummarizeJob, useJobMatch } from "@/hooks/useJobs";
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
import {
  Search,
  Loader2,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Zap,
  Briefcase,
  IndianRupee,
  FileText,
  Target,
  Clock,
} from "lucide-react";
import type { Job } from "@/types";
import { AI_PROVIDERS } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import CreatableSelect from "react-select/creatable";
import type { SingleValue } from "react-select";

const LOCATION_OPTIONS = [
  { value: "Remote", label: "🌍 Remote" },

  { value: "India", label: "🇮🇳 India" },
  { value: "Bangalore", label: "🏙 Bangalore" },
  { value: "Mumbai", label: "🏙 Mumbai" },
  { value: "Delhi", label: "🏙 Delhi" },
  { value: "Hyderabad", label: "🏙 Hyderabad" },
  { value: "Pune", label: "🏙 Pune" },
  { value: "Chennai", label: "🏙 Chennai" },
  { value: "Kolkata", label: "🏙 Kolkata" },
  { value: "Noida", label: "🏙 Noida" },
  { value: "Gurgaon", label: "🏙 Gurgaon" },
  { value: "Ahmedabad", label: "🏙 Ahmedabad" },

  { value: "United States", label: "🇺🇸 United States" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "Netherlands", label: "🇳🇱 Netherlands" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Singapore", label: "🇸🇬 Singapore" },
  { value: "UAE", label: "🇦🇪 UAE" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Norway", label: "🇳🇴 Norway" },
  { value: "Denmark", label: "🇩🇰 Denmark" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "Ireland", label: "🇮🇪 Ireland" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Portugal", label: "🇵🇹 Portugal" },
  { value: "Poland", label: "🇵🇱 Poland" },
  { value: "Israel", label: "🇮🇱 Israel" },
  { value: "Brazil", label: "🇧🇷 Brazil" },
  { value: "New Zealand", label: "🇳🇿 New Zealand" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
  { value: "Philippines", label: "🇵🇭 Philippines" },
  { value: "Malaysia", label: "🇲🇾 Malaysia" },
  { value: "Indonesia", label: "🇮🇩 Indonesia" },

  { value: "New York", label: "🗽 New York" },
  { value: "London", label: "🎡 London" },
  { value: "San Francisco", label: "🌉 San Francisco" },
  { value: "Berlin", label: "🏛 Berlin" },
  { value: "Toronto", label: "🍁 Toronto" },
  { value: "Sydney", label: "🦘 Sydney" },
  { value: "Amsterdam", label: "🚲 Amsterdam" },
  { value: "Dubai", label: "🏙 Dubai" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "30", label: "30 per page" },
  { value: "40", label: "40 per page" },
  { value: "50", label: "50 per page" },
  { value: "75", label: "75 per page" },
  { value: "100", label: "100 per page" },
];

type LocationOption = { value: string; label: string };

export default function JobsPage() {
  const resumeSkills = useResumeSkills();
  const { canSeeAllJobs, canAutoApply } = useAuthStore();

  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [locationOption, setLocationOption] = useState<LocationOption | null>(
    null,
  );
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(30);
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [maxAgeDays, setMaxAgeDays] = useState(30);

  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);

  const [summaryModal, setSummaryModal] = useState<Job | null>(null);
  const [matchModal, setMatchModal] = useState<Job | null>(null);
  const [matchResult, setMatchResult] = useState<Job | null>(null);

  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    targetTier?: "GOLD" | "PLATINUM";
  }>({ open: false });
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const computedLocations = (() => {
    const locs: string[] = [];
    if (isRemote) locs.push("Remote");
    const loc = locationOption?.value.trim();
    if (loc && loc !== "Remote") locs.push(loc);
    return locs;
  })();

  useEffect(() => {
    if (resumeSkills.length > 0 && skillTags.length === 0 && !searchQuery) {
      setSkillTags(resumeSkills.slice(0, 10));
    }
  }, [resumeSkills, skillTags.length, searchQuery]);

  const LPA_TO_USD = 1200;
  const { data: pagedJobs, isLoading } = useJobSearch(
    searchQuery,
    computedLocations,
    page,
    size,
    minSalary ? Math.round(Number(minSalary) * LPA_TO_USD) : undefined,
    maxSalary ? Math.round(Number(maxSalary) * LPA_TO_USD) : undefined,
    maxAgeDays,
    aiSearchEnabled,
  );

  const generatedQuery = pagedJobs?.generatedQuery ?? null;
  useEffect(() => {
    if (generatedQuery && !query) {
      setQuery(generatedQuery);
    }
  }, [generatedQuery, query]);

  const summarizeMutation = useSummarizeJob();
  const { refetch: fetchMatch, isFetching: matchFetching } = useJobMatch(
    matchModal?.id ?? "",
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
    if (query.trim()) return query.trim();
    return "";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = buildSearchQuery();
    const hasContext = skillTags.length > 0 || computedLocations.length > 0;

    if (q) {
      setAiSearchEnabled(false);
      setSearchQuery(q);
      setPage(0);
    } else if (hasContext) {
      setAiSearchEnabled(true);
      setSearchQuery("");
      setPage(0);
    }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSize(Number(e.target.value));
    setPage(0);
  };

  const removeSkill = (skill: string) =>
    setSkillTags(skillTags.filter((s) => s !== skill));
  const addSkill = (skill: string) => {
    if (skill && !skillTags.includes(skill))
      setSkillTags([...skillTags, skill]);
  };

  const handleQuickApply = (job: Job) => {
    if (!canSeeAllJobs()) {
      setUpgradeModal({ open: true, targetTier: "GOLD" });
      return;
    }
    setApplyModal(job);
  };

  const toggleJobSelect = (jobId: string) => {
    if (!canAutoApply()) {
      setUpgradeModal({ open: true, targetTier: "PLATINUM" });
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
      setUpgradeModal({ open: true, targetTier: "PLATINUM" });
      return;
    }
    setBulkApplying(true);
    setBulkResult(null);
    try {
      await api.post("/auto-apply/queue", { jobIds: Array.from(selectedJobs) });
      setBulkResult(
        `${selectedJobs.size} job(s) added to your auto-apply queue!`,
      );
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
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Find Jobs</h1>
      </div>

      <Card>
        <CardContent className="py-4 space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            {}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[260px]">
                <Input
                  placeholder="Job title, keywords, or company"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  label="Keywords"
                />
              </div>
              <div className="flex items-end pb-0">
                <Button type="submit" loading={isLoading}>
                  <Search className="h-4 w-4" /> Search Jobs
                </Button>
              </div>
            </div>

            {}
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer pb-[9px]">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="h-4 w-4 rounded border border-black/20 dark:border-white/20 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-[#1d1d1f] dark:text-[#e5e5ea]">
                  Remote Only
                </span>
              </label>
              <div className="flex-1 min-w-[240px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country / City
                </label>
                <CreatableSelect<LocationOption>
                  isClearable
                  placeholder="Type or select a location…"
                  options={LOCATION_OPTIONS}
                  value={locationOption}
                  onChange={(v: SingleValue<LocationOption>) =>
                    setLocationOption(v ?? null)
                  }
                  formatCreateLabel={(input) => `Search "${input}"`}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: "38px",
                      fontSize: "13px",
                      borderColor: state.isFocused ? "#6366f1" : "rgba(0,0,0,0.1)",
                      borderWidth: "1px",
                      boxShadow: state.isFocused ? "0 0 0 3px rgba(99,102,241,0.25)" : "none",
                      borderRadius: "12px",
                      backgroundColor: "white",
                      "&:hover": { borderColor: "#6366f1" },
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 50,
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
                      fontSize: "13px",
                      overflow: "hidden",
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? "#6366f1" : state.isFocused ? "#f5f5f7" : "white",
                      color: state.isSelected ? "white" : "#1d1d1f",
                      fontWeight: state.isSelected ? "600" : "400",
                      fontSize: "13px",
                    }),
                    singleValue: (base) => ({ ...base, color: "#1d1d1f" }),
                    placeholder: (base) => ({ ...base, color: "#86868b", fontSize: "13px" }),
                    clearIndicator: (base) => ({ ...base, cursor: "pointer" }),
                    input: (base) => ({ ...base, color: "#1d1d1f" }),
                  }}
                />
              </div>
            </div>

            {}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-1 pb-[9px]">
                <IndianRupee className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
                <span className="text-xs font-medium text-[#1d1d1f] dark:text-[#e5e5ea]">
                  Salary / CTC (LPA)
                </span>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-1">
                    Min
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 5"
                    value={minSalary}
                    onChange={(e) => setMinSalary(e.target.value)}
                    className="w-28 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white px-3 py-2 text-sm font-medium nb-input-focus outline-none"
                  />
                </div>
                <span className="pb-2 text-gray-400 font-bold">—</span>
                <div>
                  <label className="block text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-1">
                    Max
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 30"
                    value={maxSalary}
                    onChange={(e) => setMaxSalary(e.target.value)}
                    className="w-28 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white px-3 py-2 text-sm font-medium nb-input-focus outline-none"
                  />
                </div>
              </div>
            </div>

            {}
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-1 pb-[9px]">
                <Clock className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
                <span className="text-xs font-medium text-[#1d1d1f] dark:text-[#e5e5ea]">
                  Posted within
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[7, 14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMaxAgeDays(d)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${maxAgeDays === d ? "border-indigo-600 bg-indigo-600 text-white" : "border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#e5e5ea] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]"}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-medium text-[#1d1d1f] dark:text-[#e5e5ea]">
                  Skills from Resume
                </label>
                {resumeSkills.length > 0 && (
                  <span className="flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-3 w-3" /> Auto-detected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {skillTags.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 text-xs font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-indigo-900 dark:hover:text-indigo-200"
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
                    <p className="text-xs font-bold text-[#86868b] dark:text-[#8e8e93] mb-1">
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
                            className="rounded-full border border-dashed border-black/10 dark:border-white/10 text-[#86868b] dark:text-[#8e8e93] px-2.5 py-0.5 text-xs font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
          <span className="ml-3 text-sm font-bold text-[#86868b] dark:text-[#8e8e93]">
            {aiSearchEnabled && !searchQuery
              ? "AI is crafting your search keywords…"
              : "Searching jobs…"}
          </span>
        </div>
      )}

      {generatedQuery && (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 px-4 py-2.5 text-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="text-[#6e6e73] dark:text-[#8e8e93] font-medium">
            AI searched for:{" "}
            <span className="font-semibold text-indigo-700 dark:text-indigo-400">
              {generatedQuery}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setQuery(generatedQuery);
              setAiSearchEnabled(false);
            }}
            className="ml-auto text-xs text-indigo-500 underline underline-offset-2 hover:text-indigo-700"
          >
            Edit
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {!canSeeAllJobs() && searchQuery
                  ? `Showing 2 of many results (free plan)`
                  : totalElements > 0
                    ? `${totalElements.toLocaleString()} jobs found`
                    : `${jobs.length} jobs found`}
                {canSeeAllJobs() && totalPages > 1 && (
                  <span className="text-[#86868b] dark:text-[#8e8e93]">
                    {" "}
                    · page {page + 1} of {totalPages}
                  </span>
                )}
              </p>
              {computedLocations.length > 0 && (
                <div className="flex items-center gap-1">
                  {computedLocations.map((loc) => (
                    <Badge
                      key={loc}
                      className="bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600 text-[10px]"
                    >
                      {loc}
                    </Badge>
                  ))}
                </div>
              )}
              {(minSalary || maxSalary) && (
                <Badge className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-400 text-[10px]">
                  ₹{minSalary || "0"}–{maxSalary || "∞"} LPA
                </Badge>
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
                  Auto Apply {selectedJobs.size} Job
                  {selectedJobs.size > 1 ? "s" : ""}
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
            <div
              className={`text-xs font-medium px-4 py-2 rounded-xl border ${bulkResult.includes("Failed") ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-400" : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-400"}`}
            >
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
                <div className="flex gap-2 mt-1 ml-1">
                  <button
                    type="button"
                    onClick={() => setSummaryModal(job)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-[#86868b] dark:text-[#8e8e93] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg px-2.5 py-1"
                  >
                    <FileText className="h-3 w-3" /> Summarize
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setMatchModal(job);
                      setMatchResult(null);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-[#86868b] dark:text-[#8e8e93] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg px-2.5 py-1"
                  >
                    <Target className="h-3 w-3" /> Match Score
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!canSeeAllJobs() && searchQuery && (
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 p-6 text-center space-y-3">
              <Lock className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mx-auto" />
              <h3 className="font-semibold text-[#1d1d1f] dark:text-white">
                Unlock All Job Results
              </h3>
              <p className="text-sm font-medium text-[#86868b] dark:text-[#8e8e93]">
                You&apos;re seeing 2 of many matching jobs. Upgrade to see all
                results and apply faster.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() =>
                    setUpgradeModal({ open: true, targetTier: "GOLD" })
                  }
                >
                  <Briefcase className="h-4 w-4" /> Gold — ₹325/mo
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setUpgradeModal({ open: true, targetTier: "PLATINUM" })
                  }
                >
                  <Zap className="h-4 w-4" /> Platinum — ₹500/mo
                </Button>
              </div>
            </div>
          )}

          {canSeeAllJobs() && showPagination && (
            <div className="flex items-center justify-center gap-1 pt-4 flex-wrap">
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
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {buildPageRange(page, totalPages).map((p) =>
                  p === "…" ? (
                    <span key={p} className="px-2 text-gray-400 dark:text-[#8b949e] font-bold select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(Number(p) - 1)}
                      className={`min-w-[2rem] h-8 px-2 transition-all ${Number(p) - 1 === page ? "rounded-full bg-indigo-600 text-white font-medium text-xs" : "rounded-full border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-[#e5e5ea] bg-white dark:bg-[#1c1c1e] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] font-medium text-xs"}`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
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
        <div className="text-center py-12 font-bold text-[#86868b] dark:text-[#8e8e93]">
          No jobs found. Try different skills or locations.
        </div>
      )}

      {!searchQuery && !aiSearchEnabled && (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f2f2f7] dark:bg-[#2c2c2e]">
            <Search className="h-8 w-8 text-gray-400 dark:text-[#8b949e]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
              Search for jobs
            </h3>
            <p className="text-sm font-medium text-[#86868b] dark:text-[#8e8e93] mb-2 max-w-sm mt-1">
              {resumeSkills.length > 0
                ? "Your resume skills are loaded. Hit Search and AI will craft the perfect keywords!"
                : "Upload a resume to auto-detect your skills, or type keywords and hit Search."}
            </p>
            {resumeSkills.length > 0 && (
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />
                Leave the keyword box empty to let AI generate professional search
                terms from your profile
              </p>
            )}
          </div>
        </div>
      )}

      <Modal
        open={!!summaryModal}
        onClose={() => setSummaryModal(null)}
        title="Job Summary"
      >
        {summaryModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">{summaryModal.title}</p>
              <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">{summaryModal.company}</p>
            </div>
            {summaryModal.aiSummary ? (
              <p className="text-sm font-medium text-gray-700 dark:text-[#c9d1d9] whitespace-pre-line">
                {summaryModal.aiSummary}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#86868b] dark:text-[#8e8e93]">
                  Generate a concise AI summary of this job&apos;s key
                  requirements and tech stack.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSummaryModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={summarizeMutation.isPending}
                    onClick={async () => {
                      const updated = await summarizeMutation.mutateAsync(
                        summaryModal.id,
                      );
                      setSummaryModal(updated);
                    }}
                  >
                    <Sparkles className="h-4 w-4" /> Summarize
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!matchModal}
        onClose={() => {
          setMatchModal(null);
          setMatchResult(null);
        }}
        title="Resume Match"
      >
        {matchModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">{matchModal.title}</p>
              <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">{matchModal.company}</p>
            </div>
            {matchResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {matchResult.matchScore != null
                      ? Math.round(matchResult.matchScore)
                      : "—"}
                    %
                  </span>
                  {matchResult.matchStrength && (
                    <Badge
                      className={`text-xs font-black ${matchResult.matchStrength === "STRONG" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-400" : matchResult.matchStrength === "MODERATE" ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-400"}`}
                    >
                      {matchResult.matchStrength}
                    </Badge>
                  )}
                </div>
                {matchResult.missingSkills &&
                  matchResult.missingSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-[#86868b] dark:text-[#8e8e93] mb-1 uppercase tracking-wide">
                        Missing skills:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {matchResult.missingSkills.map((s) => (
                          <Badge
                            key={s}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-400 text-xs"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#86868b] dark:text-[#8e8e93]">
                  Compare this job against your resume skills to see your match
                  score and skill gaps.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMatchModal(null);
                      setMatchResult(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={matchFetching}
                    onClick={async () => {
                      const { data } = await fetchMatch();
                      if (data) setMatchResult(data);
                    }}
                  >
                    <Target className="h-4 w-4" /> Analyse Match
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!applyModal}
        onClose={() => setApplyModal(null)}
        title="Quick Apply"
      >
        {applyModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">{applyModal.title}</p>
              <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">{applyModal.company}</p>
            </div>
            <Select
              label="AI Provider for Cover Letter"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              options={AI_PROVIDERS}
            />
            <p className="text-sm font-medium text-[#86868b] dark:text-[#8e8e93]">
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
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [];
  const add = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };
  add(1);
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current); i <= Math.min(total - 1, current + 2); i++)
    add(i);
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
        className="rounded-full border border-dashed border-black/10 dark:border-white/10 text-[#86868b] dark:text-[#8e8e93] px-2.5 py-0.5 text-xs font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        + Add skill
      </button>
    );
  }

  return (
    <input
      autoFocus
      className="rounded-[3px] border-2 border-indigo-400 bg-white dark:bg-[#0d1117] text-black dark:text-white px-2.5 py-0.5 text-xs font-bold nb-input-focus outline-none w-28"
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
