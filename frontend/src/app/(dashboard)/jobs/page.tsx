"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApplications, useUpdateStatus } from "@/hooks/useApplications";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { STATUS_COLORS, STATUS_LABELS, SOURCE_COLORS } from "@/lib/constants";
import { formatDate, timeAgo, toCamelCase } from "@/lib/utils";
import PageTransition, { StaggerList, StaggerItem } from "@/components/ui/PageTransition";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Bookmark,
  Loader2,
  ExternalLink,
  Building2,
  MapPin,
  Clock,
  Send,
  Search,
  RotateCcw,
  FileText,
  Inbox,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Application } from "@/types";
import Link from "next/link";

type Tab = "saved" | "applied" | "skipped";

const APPLIED_STATUSES = ["APPLIED", "INTERVIEWING", "OFFERED", "REJECTED", "WITHDRAWN"];

export default function JobsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("saved");

  // Fetch all applications at once — group client-side by tab
  const { data, isLoading } = useApplications(undefined, 0, 200);
  const updateStatus = useUpdateStatus();

  const allApps = data?.content ?? [];
  const notApplied = allApps.filter((a) => a.status === "SAVED");
  const applied = allApps.filter((a) => APPLIED_STATUSES.includes(a.status));
  const skipped = allApps.filter((a) => a.status === "NOT_INTERESTED");

  const tabs = [
    { key: "saved" as Tab, label: "Not Applied", count: notApplied.length, icon: Bookmark },
    { key: "applied" as Tab, label: "Applied", count: applied.length, icon: CheckCircle2 },
    { key: "skipped" as Tab, label: "Skipped", count: skipped.length, icon: XCircle },
  ];

  const currentApps =
    activeTab === "saved" ? notApplied : activeTab === "applied" ? applied : skipped;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Jobs</h1>
            <p className="mt-0.5 text-sm text-[#86868b] dark:text-[#8e8e93]">
              Track all positions across every stage
            </p>
          </div>
          <Button onClick={() => router.push("/search")} size="sm">
            <Search className="h-4 w-4" /> Find Jobs
          </Button>
        </div>

        {/* Summary row */}
        {!isLoading && allApps.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    activeTab === tab.key
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-black/[0.06] bg-white hover:border-indigo-300 dark:border-white/[0.08] dark:bg-[#1c1c1e]"
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        activeTab === tab.key
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-[#86868b] dark:text-[#8e8e93]"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        activeTab === tab.key
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-[#86868b] dark:text-[#8e8e93]"
                      )}
                    >
                      {tab.label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      activeTab === tab.key
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-[#1d1d1f] dark:text-white"
                    )}
                  >
                    {tab.count}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-black/[0.06] dark:border-white/[0.08]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-[#86868b] hover:text-[#1d1d1f] dark:text-[#8e8e93] dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      activeTab === tab.key
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "bg-[#f2f2f7] text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#8e8e93]"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-indigo-600" />
          </div>
        ) : currentApps.length === 0 ? (
          <EmptyTabState tab={activeTab} onSearch={() => router.push("/search")} />
        ) : (
          <StaggerList className="space-y-3">
            {currentApps.map((app) => (
              <StaggerItem key={app.id}>
                <AppCard
                  app={app}
                  tab={activeTab}
                  onUpdateStatus={(status) => updateStatus.mutate({ id: app.id, status })}
                  isUpdating={updateStatus.isPending}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </PageTransition>
  );
}

// ── Empty state per tab ────────────────────────────────────────────────────────

function EmptyTabState({ tab, onSearch }: { tab: Tab; onSearch: () => void }) {
  const config: Record<
    Tab,
    { title: string; desc: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    saved: {
      title: "No saved jobs yet",
      desc: "Bookmark jobs from the Search page and they will appear here.",
      icon: Inbox,
    },
    applied: {
      title: "No applications yet",
      desc: "Use Quick Apply on the Search page to start submitting applications.",
      icon: Send,
    },
    skipped: {
      title: "No skipped jobs",
      desc: "Jobs you skip from search results will be listed here.",
      icon: XCircle,
    },
  };
  const { title, desc, icon: Icon } = config[tab];

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f2f2f7] dark:bg-[#2c2c2e]">
        <Icon className="h-8 w-8 text-gray-400 dark:text-[#8b949e]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-[#86868b] dark:text-[#8e8e93]">{desc}</p>
      </div>
      <Button onClick={onSearch} size="sm">
        <Search className="h-4 w-4" /> Search Jobs
      </Button>
    </div>
  );
}

// ── Application card ──────────────────────────────────────────────────────────

function AppCard({
  app,
  tab,
  onUpdateStatus,
  isUpdating,
}: {
  app: Application;
  tab: Tab;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
}) {
  const { job } = app;
  const statusColor = STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600";
  const statusLabel = STATUS_LABELS[app.status] ?? app.status;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Link
                href={`/jobs/${job.id}`}
                className="text-sm font-semibold text-[#1d1d1f] hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
              >
                {job.title}
              </Link>
              <Badge className={SOURCE_COLORS[job.source] ?? "bg-gray-100 text-gray-700"}>
                {job.source}
              </Badge>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  statusColor
                )}
              >
                {statusLabel}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#86868b] dark:text-[#8e8e93]">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {job.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {tab === "applied"
                  ? `Applied ${formatDate(app.appliedAt)}`
                  : timeAgo(app.appliedAt)}
              </span>
              {app.matchScore != null && (
                <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-3.5 w-3.5" /> {Math.round(app.matchScore)}% match
                </span>
              )}
            </div>

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {job.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-[10px] font-medium text-[#6e6e73] dark:bg-[#2c2c2e] dark:text-[#8e8e93]"
                  >
                    {toCamelCase(tag)}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            {app.notes && (
              <p className="mt-1.5 line-clamp-2 text-xs text-[#86868b] italic dark:text-[#8e8e93]">
                {app.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col gap-2">
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Button>
            </a>

            {tab === "saved" && (
              <Button size="sm" onClick={() => onUpdateStatus("APPLIED")} loading={isUpdating}>
                <Send className="h-3.5 w-3.5" /> Mark Applied
              </Button>
            )}

            {tab === "skipped" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus("SAVED")}
                loading={isUpdating}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            )}

            {tab === "applied" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus("WITHDRAWN")}
                loading={isUpdating}
                className="border-red-400 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-3.5 w-3.5" /> Withdraw
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
