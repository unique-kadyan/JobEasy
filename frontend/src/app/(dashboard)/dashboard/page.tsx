"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Analytics, Application, PagedResponse } from "@/types";
import StatsCards from "@/components/dashboard/StatsCards";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Search, FileText, Send } from "lucide-react";

export default function DashboardPage() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get("/analytics/summary")).data,
  });

  const { data: recentApps } = useQuery<PagedResponse<Application>>({
    queryKey: ["applications", null, 0],
    queryFn: async () => (await api.get("/applications?page=0&size=5")).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Your job application overview</p>
      </div>

      <StatsCards analytics={analytics} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/jobs">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Search className="h-4 w-4 text-indigo-600" />
                Search Jobs
              </Button>
            </Link>
            <Link href="/resumes">
              <Button variant="outline" className="w-full justify-start gap-3 mt-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Upload Resume
              </Button>
            </Link>
            <Link href="/applications">
              <Button variant="outline" className="w-full justify-start gap-3 mt-2">
                <Send className="h-4 w-4 text-indigo-600" />
                View Applications
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Recent Applications
            </h3>
            <Link
              href="/applications"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentApps?.content && recentApps.content.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentApps.content.map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {app.job.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {app.job.company} &middot; {formatDate(app.appliedAt)}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[app.status]}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                No applications yet. Start by searching for jobs!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
