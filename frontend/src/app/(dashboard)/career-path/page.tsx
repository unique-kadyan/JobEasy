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
} from "lucide-react";
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
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20 mb-6">
        <Lock className="h-9 w-9 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Career Path Analysis
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-2">
        Unlock AI-powered career path recommendations, role progression
        checkpoints, and mandatory skill plans.
      </p>
      <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-8">
        Available on Gold and Platinum plans
      </p>
      <div className="flex gap-4 justify-center flex-wrap">
        <div className="rounded-xl border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-6 py-4 text-left min-w-[180px]">
          <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Gold</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>✓ Career path analysis</li>
            <li>✓ 10 job results</li>
            <li>✓ Smart resume</li>
            <li>✓ 25 cover letters/day</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 px-6 py-4 text-left min-w-[180px]">
          <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Platinum</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
        <button
          className="w-full text-left"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {role}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {path.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                ~{path.estimatedYears}y
              </Badge>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            {path.mandatorySkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Mandatory Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {path.mandatorySkills.map((skill) => (
                    <Badge
                      key={skill}
                      className="bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {path.checkpoints.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Checkpoints
                </p>
                <ol className="relative border-l-2 border-indigo-200 dark:border-indigo-800 ml-2 space-y-4">
                  {path.checkpoints.map((cp, i) => (
                    <li key={i} className="ml-5">
                      <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white dark:ring-gray-900">
                        <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                      </span>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {cp.milestone}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {cp.description}
                          </p>
                          {cp.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {cp.skills.map((s) => (
                                <Badge
                                  key={s}
                                  className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs"
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 whitespace-nowrap shrink-0 text-xs">
                          <BookOpen className="h-3 w-3 mr-1" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Career Path
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Career Path
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
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
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
          {(error as Error).message || "Analysis failed. Please ensure your resume and profile are complete, then try again."}
        </div>
      )}

      {!data && !isLoading && !error && (
        <div className="text-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Ready to map your career
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            Upload your resume and complete your profile for the most accurate
            analysis. Click &ldquo;Analyse My Career&rdquo; to start.
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current level:
            </p>
            <Badge
              className={
                LEVEL_COLORS[data.currentLevel] ??
                "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }
            >
              {LEVEL_LABELS[data.currentLevel] ?? data.currentLevel}
            </Badge>
          </div>

          {data.suggestedRoles.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
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
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
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
