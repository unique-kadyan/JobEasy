"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SOURCE_COLORS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { MapPin, Building2, Clock, DollarSign, ExternalLink, Bookmark, BookmarkCheck, CheckCircle2 } from "lucide-react";
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
  const scoreColor =
    score != null
      ? score >= 75
        ? "text-green-700 bg-green-50"
        : score >= 50
        ? "text-yellow-700 bg-yellow-50"
        : "text-red-700 bg-red-50"
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
        "hover:shadow-md transition-all duration-200",
        applied && "opacity-75",
        selected && "ring-2 ring-indigo-500 shadow-md"
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <button
              className={cn(
                "mt-1 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                selected
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-gray-300 hover:border-indigo-400"
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
                className="text-base font-semibold text-gray-900 hover:text-indigo-600 truncate"
              >
                {job.title}
              </Link>
              <Badge className={SOURCE_COLORS[job.source] ?? "bg-gray-100 text-gray-600"}>{job.source}</Badge>
              {applied && (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Applied
                </span>
              )}
              {score != null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor}`}>
                  {score}% match
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-2">
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
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", barColor)}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            )}

            {job.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {job.description.substring(0, 200)}...
              </p>
            )}

            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {tag}
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
              {applied ? "Applied" : "Quick Apply"}
            </Button>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3 w-3" /> View
              </Button>
            </a>
            <button
              onClick={() => setBookmarked((v) => !v)}
              className={cn(
                "w-full flex items-center justify-center py-1 rounded-md text-xs transition-colors",
                bookmarked
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )}
              title={bookmarked ? "Remove bookmark" : "Save for later"}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
