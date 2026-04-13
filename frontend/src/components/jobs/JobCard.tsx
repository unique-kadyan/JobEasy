"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  XCircle,
  Zap,
} from "@/components/ui/icons";
import { SOURCE_COLORS } from "@/lib/constants";
import { cn, timeAgo, toCamelCase } from "@/lib/utils";
import type { Job } from "@/types";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
  applied?: boolean;
  skipped?: boolean;
  selected?: boolean;
  onSelect?: (job: Job) => void;
  showCheckbox?: boolean;
}

export default function JobCard({
  job,
  onApply,
  applied,
  skipped,
  selected,
  onSelect,
  showCheckbox,
}: JobCardProps) {
  const score = job.matchScore;
  const scoreStyle =
    score != null
      ? score >= 75
        ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-400"
        : score >= 50
          ? "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400"
          : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-400"
      : "";
  const barColor =
    score != null
      ? score >= 75
        ? "bg-green-500"
        : score >= 50
          ? "bg-yellow-500"
          : "bg-red-400"
      : "bg-gray-200";

  return (
    <Card
      className={cn((applied || skipped) && "opacity-75", selected && "ring-2 ring-indigo-500")}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <button
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                selected
                  ? "border-black bg-indigo-600 dark:border-white"
                  : "border-black/20 hover:border-indigo-400 dark:border-white/20"
              )}
              onClick={() => onSelect?.(job)}
            >
              {selected && (
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path
                    d="M10 3L5 8.5 2 5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Link
                href={`/jobs/${job.id}`}
                className="truncate text-sm font-semibold text-[#1d1d1f] hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
              >
                {job.title}
              </Link>
              <Badge
                className={
                  SOURCE_COLORS[job.source] ??
                  "border-gray-400 bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
                }
              >
                {job.source}
              </Badge>
              {applied && (
                <span className="flex items-center gap-1 rounded-full border border-green-400 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" /> Applied
                </span>
              )}
              {skipped && !applied && (
                <span className="flex items-center gap-1 rounded-full border border-red-400 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <XCircle className="h-3 w-3" /> Skipped
                </span>
              )}
              {score != null && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${scoreStyle}`}
                >
                  {score}% match
                </span>
              )}
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[#86868b] dark:text-[#8e8e93]">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              )}
              {job.salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {job.salary}
                </span>
              )}
              {job.datePosted && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {timeAgo(job.datePosted)}
                </span>
              )}
            </div>

            {score != null && (
              <div className="mb-2">
                <div className="h-1 w-full overflow-hidden rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e]">
                  <div
                    className={cn("h-full transition-all duration-700", barColor)}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            )}

            {job.description && (
              <p className="line-clamp-2 text-xs text-[#86868b] dark:text-[#8e8e93]">
                {job.description.substring(0, 200)}...
              </p>
            )}

            {job.tags && job.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-[10px] font-medium text-[#6e6e73] dark:bg-[#2c2c2e] dark:text-[#8e8e93]"
                  >
                    {toCamelCase(tag)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <Tooltip
              title={
                applied
                  ? "Already applied"
                  : skipped
                    ? "Already skipped"
                    : "Quick apply with generated cover letter"
              }
            >
              <span>
                <Button
                  size="sm"
                  onClick={() => onApply?.(job)}
                  disabled={applied || skipped}
                  className={applied || skipped ? "cursor-not-allowed opacity-50" : ""}
                >
                  <Zap className="h-3.5 w-3.5" />
                  {applied ? "Applied" : "Quick Apply"}
                </Button>
              </span>
            </Tooltip>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3 w-3" /> Apply
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
