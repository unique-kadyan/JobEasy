"use client";

import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SOURCE_COLORS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { MapPin, Building2, Clock, DollarSign, ExternalLink } from "lucide-react";
import type { Job } from "@/types";
import Link from "next/link";

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
}

export default function JobCard({ job, onApply }: JobCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/jobs/${job.id}`}
                className="text-base font-semibold text-gray-900 hover:text-indigo-600 truncate"
              >
                {job.title}
              </Link>
              <Badge className={SOURCE_COLORS[job.source]}>{job.source}</Badge>
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
            {job.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {job.description.substring(0, 200)}...
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" onClick={() => onApply?.(job)}>
              Quick Apply
            </Button>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-3 w-3" /> View
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
