"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth-store";
import { LogOut, User, Search, Crown } from "@/components/ui/icons";
import CommandPalette from "@/components/ui/CommandPalette";
import Link from "next/link";
import type { ServerStatus } from "@/hooks/useKeepAlive";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ButtonBase from "@mui/material/ButtonBase";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";

const TIER_BADGE: Record<string, { label: string; color: "default" | "warning" | "primary" }> = {
  FREE: { label: "Free", color: "default" },
  GOLD: { label: "Gold", color: "warning" },
  PLATINUM: { label: "Platinum", color: "primary" },
};

const STATUS_CONFIG: Record<ServerStatus, { color: string; pulse: boolean; label: string }> = {
  up: { color: "#22c55e", pulse: false, label: "Server online" },
  down: { color: "#ef4444", pulse: true, label: "Server offline — reconnecting…" },
  connecting: { color: "#f59e0b", pulse: true, label: "Connecting to server…" },
};

export default function Topbar({ serverStatus = "connecting" }: { serverStatus?: ServerStatus }) {
  const { user, logout } = useAuth();
  const { user: storeUser } = useAuthStore();
  const [cmdOpen, setCmdOpen] = useState(false);

  const tier = storeUser?.subscriptionTier ?? "FREE";
  const tierBadge = TIER_BADGE[tier] ?? TIER_BADGE.FREE;
  const statusCfg = STATUS_CONFIG[serverStatus];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <Box
        component="header"
        sx={{
          position: "fixed",
          top: 0,
          left: 256,
          right: 0,
          zIndex: 30,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          gap: 2,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(8px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {/* Search trigger */}
        <ButtonBase
          onClick={() => setCmdOpen(true)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            minWidth: 220,
            textAlign: "left",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "rgba(99,102,241,0.04)",
              boxShadow: "0 0 0 3px rgba(99,102,241,0.08)",
            },
          }}
        >
          <Search style={{ fontSize: 15, color: "inherit", opacity: 0.5 }} />
          <Typography variant="body2" color="text.disabled" sx={{ flex: 1 }}>
            Search…
          </Typography>
          <Box
            component="kbd"
            sx={{
              fontSize: "0.65rem",
              fontFamily: "monospace",
              fontWeight: 600,
              color: "text.disabled",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              px: 0.75,
              py: 0.25,
              lineHeight: 1.6,
            }}
          >
            ⌘K
          </Box>
        </ButtonBase>

        {/* Right side */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {/* Upgrade button */}
          {tier !== "PLATINUM" && (
            <Box
              component={Link}
              href="/pricing"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                color: "white",
                textDecoration: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                transition: "all 0.15s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #4338ca, #4f46e5)",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.45)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <BoltRoundedIcon sx={{ fontSize: 14 }} />
              Upgrade
            </Box>
          )}

          {/* Tier chip */}
          <Chip
            label={tierBadge.label}
            color={tierBadge.color}
            size="small"
            sx={{ fontWeight: 600, fontSize: "0.7rem", height: 24 }}
          />

          {/* Server status */}
          <Tooltip title={statusCfg.label} placement="bottom">
            <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  bgcolor: statusCfg.color,
                  boxShadow: `0 0 0 2px ${statusCfg.color}33`,
                }}
              />
              {statusCfg.pulse && (
                <Box
                  sx={{
                    position: "absolute",
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: statusCfg.color,
                    opacity: 0.5,
                    "@keyframes ping": {
                      "0%": { transform: "scale(1)", opacity: 0.5 },
                      "100%": { transform: "scale(2.2)", opacity: 0 },
                    },
                    animation: "ping 1.2s ease-out infinite",
                  }}
                />
              )}
            </Box>
          </Tooltip>

          {/* User avatar */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: "0.8rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? <User style={{ fontSize: 16 }} />}
            </Avatar>
            <Typography
              variant="body2"
              fontWeight={600}
              color="text.primary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {user?.name}
            </Typography>
          </Stack>

          {/* Logout */}
          <Tooltip title="Sign out" placement="bottom">
            <IconButton
              size="small"
              onClick={logout}
              sx={{
                color: "text.secondary",
                transition: "all 0.15s ease",
                "&:hover": { color: "error.main", bgcolor: "error.main" + "12" },
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
