"use client";

import { useState } from "react";
import { useApplications, useUpdateStatus } from "@/hooks/useApplications";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { STATUS_COLORS, SOURCE_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Loader2, ExternalLink } from "lucide-react";
import type { ApplicationStatus } from "@/types";

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
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500">Track your job applications</p>
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
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {app.job.title}
                        </h3>
                        <Badge className={SOURCE_COLORS[app.job.source]}>
                          {app.job.source}
                        </Badge>
                        <Badge className={STATUS_COLORS[app.status]}>
                          {app.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {app.job.company}
                        {app.job.location && ` · ${app.job.location}`}
                        {` · Applied ${formatDate(app.appliedAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {page + 1} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium mb-1">No applications yet</p>
          <p className="text-sm">Search for jobs and start applying!</p>
        </div>
      )}
    </div>
  );
}
