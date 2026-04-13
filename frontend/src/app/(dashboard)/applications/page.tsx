"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Send } from "@/components/ui/icons";
import PageTransition, { StaggerItem, StaggerList } from "@/components/ui/PageTransition";
import Select from "@/components/ui/Select";
import { useApplications, useUpdateStatus } from "@/hooks/useApplications";
import { SOURCE_COLORS, STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFERED", label: "Offered" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "NOT_INTERESTED", label: "Skipped" },
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
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Applications</h1>
            <p className="mt-0.5 text-sm text-[#86868b] dark:text-[#8e8e93]">
              Track your job applications
            </p>
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
            <StaggerList className="space-y-3">
              {data.content.map((app) => (
                <StaggerItem key={app.id}>
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                              {app.job?.title ?? "Job no longer available"}
                            </h3>
                            {app.job?.source && (
                              <Badge
                                className={
                                  SOURCE_COLORS[app.job.source] ?? "bg-gray-100 text-gray-600"
                                }
                              >
                                {app.job.source}
                              </Badge>
                            )}
                            <Badge
                              className={STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}
                            >
                              {STATUS_LABELS[app.status] ?? app.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                            {app.job?.company ?? "—"}
                            {app.job?.location && ` · ${app.job.location}`}
                            {` · ${app.status === "NOT_INTERESTED" ? "Skipped" : "Applied"} ${formatDate(app.appliedAt)}`}
                          </p>
                          {app.notes && (
                            <p className="mt-1.5 line-clamp-2 rounded-lg bg-[#f5f5f7] px-2.5 py-1.5 text-xs text-[#86868b] italic dark:bg-[#2c2c2e] dark:text-[#8e8e93]">
                              {app.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
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
                          {app.job?.url && (
                            <a href={app.job.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerList>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <span className="rounded-full bg-[#f2f2f7] px-3 py-1.5 text-xs font-medium text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#8e8e93]">
                  {page + 1} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-600/10">
              <Send className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                No applications yet
              </p>
              <p className="mt-1 text-sm text-[#86868b] dark:text-[#8e8e93]">
                Search for jobs and start applying!
              </p>
            </div>
            <Link href="/jobs">
              <Button>
                <Send className="h-4 w-4" />
                Find Jobs to Apply
              </Button>
            </Link>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
