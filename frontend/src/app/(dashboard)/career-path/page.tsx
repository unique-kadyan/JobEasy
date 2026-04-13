"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { getTierFeatures } from "@/lib/tier-features";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  AlertCircle,
  CheckCheck,
} from "@/components/ui/icons";
import { toCamelCase } from "@/lib/utils";
import type { CareerPathAnalysis, CareerRolePath } from "@/types";

const LEVEL_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MID: "Mid-Level",
  SENIOR: "Senior",
  LEAD: "Lead",
  STAFF: "Staff",
  PRINCIPAL: "Principal",
};

const LEVEL_COLORS: Record<string, string> = {
  JUNIOR: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  MID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  SENIOR: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  LEAD: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  STAFF: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  PRINCIPAL: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function UpgradeGate() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
        <Lock className="h-9 w-9 text-amber-500" />
      </div>
      <h2 className="mb-3 text-2xl font-semibold text-[#1d1d1f] dark:text-white">
        Career Path Analysis
      </h2>
      <p className="mb-2 max-w-md text-[#86868b] dark:text-[#8e8e93]">
        Unlock AI-powered career path recommendations, role progression checkpoints, and mandatory
        skill plans.
      </p>
      <p className="mb-8 text-sm font-medium text-amber-600 dark:text-amber-400">
        Available on Gold and Platinum plans
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <div className="min-w-[180px] rounded-2xl border border-amber-200/60 bg-amber-50 px-6 py-4 text-left dark:border-amber-900/30 dark:bg-yellow-900/20">
          <p className="mb-2 text-sm font-semibold text-amber-700 dark:text-yellow-400">Gold</p>
          <ul className="space-y-1 text-sm text-[#3c3c43] dark:text-[#8e8e93]">
            <li>✓ Career path analysis</li>
            <li>✓ 10 job results</li>
            <li>✓ Smart resume</li>
            <li>✓ 25 cover letters/day</li>
          </ul>
        </div>
        <div className="min-w-[180px] rounded-2xl border border-slate-200/60 bg-slate-50 px-6 py-4 text-left dark:border-slate-700/40 dark:bg-slate-800/40">
          <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Platinum</p>
          <ul className="space-y-1 text-sm text-[#3c3c43] dark:text-[#8e8e93]">
            <li>✓ Everything in Gold</li>
            <li>✓ Unlimited job results</li>
            <li>✓ Auto-apply</li>
            <li>✓ Unlimited cover letters</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function RolePathCard({ role, path }: { role: string; path: CareerRolePath }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="py-4">
        <button className="w-full text-left" onClick={() => setExpanded((e) => !e)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  {role}
                </p>
                <p className="truncate text-xs text-[#86868b] dark:text-[#8e8e93]">
                  {path.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge className="bg-indigo-50 whitespace-nowrap text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                <Clock className="mr-1 h-3 w-3" />~{path.estimatedYears}y
              </Badge>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#86868b] dark:text-[#8e8e93]" />
              )}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
            {(path.mandatorySkills.length > 0 || (path.skillGaps && path.skillGaps.length > 0)) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {path.mandatorySkills.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/30 dark:bg-emerald-900/20">
                    <div className="mb-2 flex items-center gap-1.5">
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Required Skills
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {path.mandatorySkills.map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        >
                          {toCamelCase(skill)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {path.skillGaps && path.skillGaps.length > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/20">
                    <div className="mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        Skills to Develop
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {path.skillGaps.map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        >
                          {toCamelCase(skill)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {path.checkpoints.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">
                  Checkpoints
                </p>
                <ol className="relative ml-2 space-y-4 border-l-2 border-indigo-300 dark:border-indigo-800">
                  {path.checkpoints.map((cp, i) => (
                    <li key={i} className="ml-5">
                      <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600">
                        <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                      </span>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                            {cp.milestone}
                          </p>
                          <p className="mt-0.5 text-xs text-[#86868b] dark:text-[#8e8e93]">
                            {cp.description}
                          </p>
                          {cp.skills.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {cp.skills.map((s) => (
                                <Badge
                                  key={s}
                                  className="bg-[#f2f2f7] text-[10px] text-[#6e6e73] dark:bg-[#2c2c2e] dark:text-[#8e8e93]"
                                >
                                  {toCamelCase(s)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge className="shrink-0 bg-[#f2f2f7] text-[10px] whitespace-nowrap text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#8e8e93]">
                          <BookOpen className="mr-1 h-3 w-3" />
                          {cp.timelineMonths}mo
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CareerPathPage() {
  const { user } = useAuthStore();
  const tier = user?.subscriptionTier ?? "FREE";
  const features = getTierFeatures(tier);

  const [analysisEnabled, setAnalysisEnabled] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<CareerPathAnalysis>({
    queryKey: ["career-path"],
    queryFn: () => api.get("/career-path/analyze").then((r) => r.data),
    enabled: analysisEnabled,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (!features.careerPath) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Career Path</h1>
          <p className="mt-0.5 text-sm text-[#86868b] dark:text-[#8e8e93]">
            AI-powered career progression analysis
          </p>
        </div>
        <UpgradeGate />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Career Path</h1>
          <p className="mt-0.5 text-sm text-[#86868b] dark:text-[#8e8e93]">
            AI-powered analysis of your next career moves
          </p>
        </div>
        <Button
          onClick={() => {
            setAnalysisEnabled(true);
            refetch();
          }}
          loading={isLoading}
        >
          <Zap className="h-4 w-4" />
          {data ? "Re-analyse" : "Analyse My Career"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          {(error as Error).message ||
            "Analysis failed. Please ensure your resume and profile are complete, then try again."}
        </div>
      )}

      {!data && !isLoading && !error && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
            <TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
              Ready to map your career
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#86868b] dark:text-[#8e8e93]">
              Upload your resume and complete your profile for the most accurate analysis. Click
              &ldquo;Analyse My Career&rdquo; to start.
            </p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">Current level:</p>
            <Badge
              className={
                LEVEL_COLORS[data.currentLevel] ??
                "bg-[#f2f2f7] text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-white"
              }
            >
              {LEVEL_LABELS[data.currentLevel] ?? data.currentLevel}
            </Badge>
          </div>

          {data.suggestedRoles.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <p className="mb-3 text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">
                  Suggested Next Roles
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.suggestedRoles.map((role) => (
                    <Badge
                      key={role}
                      className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <p className="mb-3 text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">
              Career Paths
            </p>
            <div className="space-y-3">
              {Object.entries(data.careerPaths).map(([role, path]) => (
                <RolePathCard key={role} role={role} path={path} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
