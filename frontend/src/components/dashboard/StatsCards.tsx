"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Send, MessageSquare, Trophy, XCircle, TrendingUp } from "lucide-react";
import type { Analytics } from "@/types";

interface StatsCardsProps {
  analytics: Analytics | undefined;
  loading: boolean;
}

export default function StatsCards({ analytics, loading }: StatsCardsProps) {
  const stats = [
    {
      label: "Total Applied",
      value: analytics?.totalApplications ?? 0,
      icon: Send,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Interviewing",
      value: analytics?.interviewing ?? 0,
      icon: MessageSquare,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Offers",
      value: analytics?.offered ?? 0,
      icon: Trophy,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Rejected",
      value: analytics?.rejected ?? 0,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Response Rate",
      value: `${analytics?.responseRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 py-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stat.value}
              </p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
