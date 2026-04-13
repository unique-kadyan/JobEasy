"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import {
  LayoutDashboard,
  Search,
  Send,
  Mail,
  Settings,
  Zap,
  Sparkles,
  User,
  CreditCard,
  Crown,
  TrendingUp,
  MessageSquare,
} from "@/components/ui/icons";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Find Jobs", icon: Search },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/smart-resume", label: "Smart Resume", icon: Sparkles },
  { href: "/cover-letters", label: "Cover Letters", icon: Mail },
  { href: "/career-path", label: "Career Path", icon: TrendingUp },
  { href: "/interview-prep", label: "Interview Prep", icon: MessageSquare },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TIER_CONFIG: Record<
  string,
  {
    label: string;
    gradient: string;
    upgradeLabel?: string;
    upgradeHint?: string;
  }
> = {
  FREE: {
    label: "Free Plan",
    gradient: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)",
    upgradeLabel: "Upgrade to Gold →",
    upgradeHint: "Unlock 10× more jobs",
  },
  GOLD: {
    label: "Gold Plan",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    upgradeLabel: "Go Platinum →",
    upgradeHint: "Unlock auto-apply & more",
  },
  PLATINUM: {
    label: "Platinum Plan",
    gradient: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
  },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const tier = user?.subscriptionTier ?? "FREE";
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.FREE;

  return (
    <Box
      component="aside"
      sx={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 40,
        height: "100vh",
        width: 256,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        boxShadow: "4px 0 24px rgba(0,0,0,0.05)",
      }}
    >
      {/* Logo */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: 2.5,
          height: 64,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
            flexShrink: 0,
          }}
        >
          <Zap style={{ fontSize: 18, color: "white" }} />
        </Box>
        <Typography variant="h6" fontWeight={700} color="text.primary" letterSpacing={-0.5}>
          Rolevo
        </Typography>
      </Stack>

      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          py: 1.5,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { borderRadius: 4, bgcolor: "divider" },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
        }}
      >
        <Typography
          variant="caption"
          color="text.disabled"
          fontWeight={600}
          sx={{ px: 1.5, mb: 1, display: "block", letterSpacing: 0.8, fontSize: "0.65rem" }}
        >
          MENU
        </Typography>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Box
              key={item.href}
              component={Link}
              href={item.href}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1,
                mb: 0.25,
                borderRadius: 2,
                textDecoration: "none",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.15s ease",
                color: isActive ? "primary.main" : "text.secondary",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.875rem",
                bgcolor: isActive ? "rgba(99,102,241,0.08)" : "transparent",
                "&:hover": {
                  bgcolor: isActive ? "rgba(99,102,241,0.12)" : "action.hover",
                  color: isActive ? "primary.main" : "text.primary",
                  transform: "translateX(2px)",
                },
                // Left active indicator bar
                "&::before": isActive
                  ? {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: "20%",
                      height: "60%",
                      width: 3,
                      borderRadius: "0 3px 3px 0",
                      background: "linear-gradient(180deg, #4f46e5, #6366f1)",
                    }
                  : {},
              }}
            >
              <item.icon style={{ fontSize: 16, flexShrink: 0 }} />
              <Typography
                component="span"
                sx={{
                  fontSize: "inherit",
                  fontWeight: "inherit",
                  color: "inherit",
                  lineHeight: 1,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Plan card + Pricing link */}
      <Box sx={{ px: 1.5, pb: 2, flexShrink: 0 }}>
        <Divider sx={{ mb: 1.5 }} />

        {/* Tier badge */}
        <Box
          sx={{
            borderRadius: 2.5,
            background: cfg.gradient,
            p: 2,
            color: "white",
            mb: 0.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={tier !== "PLATINUM" ? 1 : 0}>
            <Crown style={{ fontSize: 15 }} />
            <Typography variant="caption" fontWeight={700} letterSpacing={0.5}>
              {cfg.label}
            </Typography>
          </Stack>

          {tier !== "PLATINUM" && cfg.upgradeHint && (
            <>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.82)", display: "block", mb: 1.5, lineHeight: 1.4 }}
              >
                {cfg.upgradeHint}
              </Typography>
              <Box
                component={Link}
                href="/pricing"
                sx={{
                  display: "block",
                  textAlign: "center",
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  transition: "background 0.15s ease",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
              >
                {cfg.upgradeLabel}
              </Box>
            </>
          )}

          {tier === "PLATINUM" && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.82)" }}>
              Full access unlocked ✓
            </Typography>
          )}
        </Box>

        {/* Pricing nav item */}
        <Box
          component={Link}
          href="/pricing"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            textDecoration: "none",
            transition: "all 0.15s ease",
            color: pathname === "/pricing" ? "primary.main" : "text.secondary",
            fontWeight: pathname === "/pricing" ? 600 : 500,
            fontSize: "0.875rem",
            bgcolor: pathname === "/pricing" ? "rgba(99,102,241,0.08)" : "transparent",
            "&:hover": {
              bgcolor: "action.hover",
              color: "text.primary",
              transform: "translateX(2px)",
            },
          }}
        >
          <CreditCard style={{ fontSize: 16 }} />
          <Typography
            component="span"
            sx={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}
          >
            Pricing
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
