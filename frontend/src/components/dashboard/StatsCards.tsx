"use client";

import { useEffect, useRef, useState } from "react";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { Send, MessageSquare, Trophy, XCircle, TrendingUp } from "lucide-react";
import type { Analytics } from "@/types";

interface StatsCardsProps {
  analytics: Analytics | undefined;
  loading: boolean;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const duration = 800;

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    startRef.current = null;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{display}{suffix}</>;
}

export default function StatsCards({ analytics, loading }: StatsCardsProps) {
  const stats = [
    {
      label: "Total Applied",
      value: analytics?.totalApplications ?? 0,
      suffix: "",
      icon: Send,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
      iconBorder: "border-blue-400",
    },
    {
      label: "Interviewing",
      value: analytics?.interviewing ?? 0,
      suffix: "",
      icon: MessageSquare,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-yellow-900/20",
      iconBorder: "border-amber-400",
    },
    {
      label: "Offers",
      value: analytics?.offered ?? 0,
      suffix: "",
      icon: Trophy,
      iconColor: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-50 dark:bg-green-900/20",
      iconBorder: "border-green-400",
    },
    {
      label: "Rejected",
      value: analytics?.rejected ?? 0,
      suffix: "",
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-50 dark:bg-red-900/20",
      iconBorder: "border-red-400",
    },
    {
      label: "Response Rate",
      value: analytics?.responseRate ?? 0,
      suffix: "%",
      icon: TrendingUp,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-50 dark:bg-indigo-900/20",
      iconBorder: "border-indigo-400",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[4px] border-2 border-black dark:border-[#30363d] bg-white dark:bg-[#161b22] p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5"
          style={{ boxShadow: "3px 3px 0 #000" }}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-[3px] border-2 ${stat.iconBorder} ${stat.iconBg} shrink-0`}
          >
            <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-black text-black dark:text-white">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            </p>
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-[#8b949e]">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
