"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SOURCE_COLORS } from "@/lib/constants";
import { timeAgo, toCamelCase } from "@/lib/utils";
import Tooltip from "@mui/material/Tooltip";
import { MapPin, Building2, Clock, DollarSign, ExternalLink, Bookmark, BookmarkCheck, CheckCircle2, Zap } from "@/components/ui/icons";
import type { Job } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
  applied?: boolean;
  selected?: boolean;
  onSelect?: (job: Job) => void;
  showCheckbox?: boolean;
}

export default function JobCard({ job, onApply, applied, selected, onSelect, showCheckbox }: JobCardProps) {
  const [bookmarked, setBookmarked] = useState(false);

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
      className={cn(
        applied && "opacity-75",
        selected && "ring-2 ring-indigo-500"
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <button
              className={cn(
                "mt-1 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                selected
                  ? "bg-indigo-600 border-black dark:border-white"
                  : "border-black/20 dark:border-white/20 hover:border-indigo-400"
              )}
              onClick={() => onSelect?.(job)}
            >
              {selected && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link
                href={`/jobs/${job.id}`}
                className="text-sm font-semibold text-[#1d1d1f] dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
              >
                {job.title}
              </Link>
              <Badge className={SOURCE_COLORS[job.source] ?? "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-400"}>{job.source}</Badge>
              {applied && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-400 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Applied
                </span>
              )}
              {score != null && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${scoreStyle}`}>
                  {score}% match
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#86868b] dark:text-[#8e8e93] mb-2">
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
                <div className="h-1 w-full bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-700", barColor)}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            )}

            {job.description && (
              <p className="text-xs text-[#86868b] dark:text-[#8e8e93] line-clamp-2">
                {job.description.substring(0, 200)}...
              </p>
            )}

            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] font-medium bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#6e6e73] dark:text-[#8e8e93] px-2 py-0.5 rounded-full">
                    {toCamelCase(tag)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => onApply?.(job)}
              disabled={applied}
              className={applied ? "opacity-50 cursor-not-allowed" : ""}
            >
              <Zap className="h-3.5 w-3.5" />
              {applied ? "Applied" : "Quick Apply"}
            </Button>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3 w-3" /> Apply
              </Button>
            </a>
            <Tooltip title={bookmarked ? "Remove bookmark" : "Save for later"}>
              <button
                onClick={() => setBookmarked((v) => !v)}
                className={cn(
                  "w-full flex items-center justify-center py-1 rounded-xl border text-xs transition-all",
                  bookmarked
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400"
                    : "text-gray-400 dark:text-[#8b949e] border-black/10 dark:border-white/10 hover:text-gray-600 dark:hover:text-[#c9d1d9] hover:bg-gray-50 dark:hover:bg-[#21262d]"
                )}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
