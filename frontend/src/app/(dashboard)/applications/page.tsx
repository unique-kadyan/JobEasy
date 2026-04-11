"use client";

import { useState } from "react";
import { useApplications, useUpdateStatus } from "@/hooks/useApplications";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { STATUS_COLORS, SOURCE_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Loader2, ExternalLink, Send, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApplicationStatus } from "@/types";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFERED", label: "Offered" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const UPDATE_OPTIONS = [
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFERED", label: "Offered" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

export default function ApplicationsPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useApplications(filterStatus || undefined, page);
  const updateStatus = useUpdateStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Applications</h1>
          <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">Track your job applications</p>
        </div>
        <div className="w-48">
          <Select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : data?.content && data.content.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.content.map((app) => (
              <Card key={app.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-black text-black dark:text-white text-sm uppercase tracking-wide">
                          {app.job.title}
                        </h3>
                        <Badge className={SOURCE_COLORS[app.job.source]}>
                          {app.job.source}
                        </Badge>
                        <Badge className={STATUS_COLORS[app.status]}>
                          {app.status}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e]">
                        {app.job.company}
                        {app.job.location && ` · ${app.job.location}`}
                        {` · Applied ${formatDate(app.appliedAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={app.status}
                        onChange={(e) =>
                          updateStatus.mutate({
                            id: app.id,
                            status: e.target.value,
                          })
                        }
                        options={UPDATE_OPTIONS}
                        className="w-36 text-xs"
                      />
                      <a
                        href={app.job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-3 py-1.5 text-xs font-black text-black dark:text-[#c9d1d9] uppercase tracking-wide border-2 border-black dark:border-[#30363d] rounded-[3px] bg-white dark:bg-[#161b22]">
                {page + 1} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[4px] border-2 border-black dark:border-white bg-indigo-50 dark:bg-indigo-600/10">
            <Send className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-lg font-black text-black dark:text-white uppercase tracking-tight">No applications yet</p>
            <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-1">Search for jobs and start applying!</p>
          </div>
          <Link
            href="/jobs"
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wide rounded-[3px] border-2 border-black dark:border-white nb-shadow nb-lift flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Find Jobs to Apply
          </Link>
        </div>
      )}
    </div>
  );
}
