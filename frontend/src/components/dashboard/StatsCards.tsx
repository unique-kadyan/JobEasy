"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import { Send, MessageSquare, Trophy, XCircle, TrendingUp } from "@/components/ui/icons";
import type { Analytics } from "@/types";

interface StatsCardsProps {
  analytics: Analytics | undefined;
  loading: boolean;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const duration = 900;

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    startRef.current = null;
    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

const STATS_CONFIG = [
  {
    key: "totalApplications" as keyof Analytics,
    label: "Total Applied",
    suffix: "",
    icon: Send,
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    iconBg: "rgba(59,130,246,0.1)",
    iconColor: "#3b82f6",
    barColor: "#3b82f6",
  },
  {
    key: "interviewing" as keyof Analytics,
    label: "Interviewing",
    suffix: "",
    icon: MessageSquare,
    gradient: "linear-gradient(135deg, #f59e0b, #fb923c)",
    iconBg: "rgba(245,158,11,0.1)",
    iconColor: "#f59e0b",
    barColor: "#f59e0b",
  },
  {
    key: "offered" as keyof Analytics,
    label: "Offers",
    suffix: "",
    icon: Trophy,
    gradient: "linear-gradient(135deg, #22c55e, #10b981)",
    iconBg: "rgba(34,197,94,0.1)",
    iconColor: "#22c55e",
    barColor: "#22c55e",
  },
  {
    key: "rejected" as keyof Analytics,
    label: "Rejected",
    suffix: "",
    icon: XCircle,
    gradient: "linear-gradient(135deg, #ef4444, #f97316)",
    iconBg: "rgba(239,68,68,0.1)",
    iconColor: "#ef4444",
    barColor: "#ef4444",
  },
  {
    key: "responseRate" as keyof Analytics,
    label: "Response Rate",
    suffix: "%",
    icon: TrendingUp,
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    iconBg: "rgba(99,102,241,0.1)",
    iconColor: "#6366f1",
    barColor: "#6366f1",
    showProgress: true,
  },
];

export default function StatsCards({ analytics, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 2,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ height: 3, bgcolor: "action.hover" }} />
            <CardContent sx={{ p: 2.5 }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mb: 1.5 }} />
              <Skeleton variant="text" width="60%" height={36} />
              <Skeleton variant="text" width="80%" height={16} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 2 }}
    >
      {STATS_CONFIG.map((stat) => {
        const value = (analytics?.[stat.key] as number) ?? 0;
        return (
          <Card
            key={stat.label}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
              position: "relative",
              transition: "all 0.2s ease",
              cursor: "default",
              "&:hover": {
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                transform: "translateY(-2px)",
              },
              // Gradient top border
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: stat.gradient,
              },
            }}
          >
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              {/* Icon */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: stat.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1.5,
                }}
              >
                <stat.icon style={{ fontSize: 20, color: stat.iconColor }} />
              </Box>

              {/* Value */}
              <Typography
                variant="h4"
                fontWeight={700}
                color="text.primary"
                lineHeight={1}
                mb={0.5}
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                <AnimatedNumber value={value} suffix={stat.suffix} />
              </Typography>

              {/* Label */}
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {stat.label}
              </Typography>

              {/* Progress bar for response rate */}
              {stat.showProgress && (
                <LinearProgress
                  variant="determinate"
                  value={Math.min(value, 100)}
                  sx={{
                    mt: 1.5,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    "& .MuiLinearProgress-bar": {
                      background: stat.gradient,
                      borderRadius: 2,
                    },
                  }}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
