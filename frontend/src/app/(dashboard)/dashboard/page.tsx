"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import api from "@/lib/api";
import type { Analytics, Application, PagedResponse } from "@/types";
import StatsCards from "@/components/dashboard/StatsCards";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Search, FileText, Send, Zap, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get("/analytics/summary")).data,
  });

  const { data: recentApps, isLoading: appsLoading } = useQuery<PagedResponse<Application>>({
    queryKey: ["applications", null, 0],
    queryFn: async () => (await api.get("/applications?page=0&size=5")).data,
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-gray-900">
          Good to see you, {firstName}!
        </h1>
        <p className="text-gray-500">Here&apos;s your job application overview.</p>
      </motion.div>

      <motion.div variants={item}>
        <StatsCards analytics={analytics} loading={isLoading} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-gray-200">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/jobs">
              <Button variant="outline" className="w-full justify-start gap-3 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                <Search className="h-4 w-4 text-indigo-600" />
                Search Jobs
              </Button>
            </Link>
            <Link href="/resumes">
              <Button variant="outline" className="w-full justify-start gap-3 mt-2 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                <FileText className="h-4 w-4 text-indigo-600" />
                Upload Resume
              </Button>
            </Link>
            <Link href="/applications">
              <Button variant="outline" className="w-full justify-start gap-3 mt-2 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                <Send className="h-4 w-4 text-indigo-600" />
                View Applications
              </Button>
            </Link>
            <Link href="/smart-resume">
              <Button variant="outline" className="w-full justify-start gap-3 mt-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Smart Resume
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Applications</h3>
            <Link
              href="/applications"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : recentApps?.content && recentApps.content.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentApps.content.map((app) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {app.job.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {app.job.company} &middot; {formatDate(app.appliedAt)}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[app.status]}>{app.status}</Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                  <Zap className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-sm font-medium text-gray-900">No applications yet</p>
                <p className="text-xs text-gray-400 max-w-xs">Start by searching for jobs that match your skills and apply with one click.</p>
                <Link href="/jobs">
                  <Button size="sm" className="mt-1">
                    <Search className="h-3.5 w-3.5" />
                    Find Jobs
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
