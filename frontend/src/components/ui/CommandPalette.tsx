"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  LayoutDashboard,
  Search,
  Send,
  Mail,
  Settings,
  User,
  CreditCard,
  Sparkles,
} from "@/components/ui/icons";

const COMMANDS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Find Jobs", icon: Search, href: "/jobs" },
  { label: "Applications", icon: Send, href: "/applications" },
  { label: "Smart Resume", icon: Sparkles, href: "/smart-resume" },
  { label: "Cover Letters", icon: Mail, href: "/cover-letters" },
  { label: "Profile", icon: User, href: "/profile" },
  { label: "Upgrade Plan", icon: CreditCard, href: "/pricing" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const runCommand = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 150 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.12)",
          bgcolor: "background.paper",
          backgroundImage: "none",
          mt: { xs: "10vh", sm: "15vh" },
          mx: 2,
          verticalAlign: "top",
        },
      }}
      sx={{
        "& .MuiDialog-container": { alignItems: "flex-start" },
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(4px)",
          bgcolor: "rgba(0,0,0,0.4)",
        },
      }}
    >
      <Command shouldFilter={true}>
        {/* Search bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <SearchRoundedIcon
            sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0 }}
          />
          <Box
            component={Command.Input}
            value={search}
            onValueChange={setSearch}
            placeholder="Search pages and actions…"
            autoFocus
            sx={{
              flex: 1,
              border: "none",
              outline: "none",
              bgcolor: "transparent",
              fontSize: "0.9375rem",
              color: "text.primary",
              fontFamily: "inherit",
              "::placeholder": { color: "text.disabled" },
            }}
          />
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: "text.secondary",
              "&:hover": { color: "text.primary" },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Results */}
        <Box
          component={Command.List}
          sx={{ maxHeight: 320, overflowY: "auto" }}
        >
          <Box
            component={Command.Empty}
            sx={{
              py: 8,
              textAlign: "center",
              color: "text.disabled",
              fontSize: "0.875rem",
            }}
          >
            No results found.
          </Box>

          <Box
            component={Command.Group}
            sx={{
              "& [cmdk-group-heading]": {
                px: 2,
                py: 1,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: 0.8,
                color: "text.disabled",
                textTransform: "uppercase",
              },
            }}
          >
            <Typography
              component="span"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ "cmdk-group-heading": "" } as any)}
            >
              Navigation
            </Typography>

            {COMMANDS.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <Box
                  key={cmd.href}
                  component={Command.Item}
                  value={cmd.label}
                  onSelect={() => runCommand(cmd.href)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    mx: 1,
                    my: 0.25,
                    borderRadius: 2,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "text.primary",
                    transition: "all 0.1s ease",
                    "&[aria-selected='true']": {
                      bgcolor: "rgba(99,102,241,0.08)",
                      color: "primary.main",
                      "& .cmd-icon": { color: "primary.main" },
                    },
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <Icon
                    className="cmd-icon"
                    style={{ fontSize: 16, color: "inherit", opacity: 0.7 }}
                  />
                  <Typography variant="body2" color="inherit" fontWeight={500}>
                    {cmd.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Footer hints */}
        <Divider />
        <Stack
          direction="row"
          spacing={2.5}
          sx={{ px: 2.5, py: 1.25, bgcolor: "action.hover" }}
        >
          {[
            { keys: "↑↓", label: "navigate" },
            { keys: "↵", label: "select" },
            { keys: "Esc", label: "close" },
          ].map(({ keys, label }) => (
            <Stack
              key={label}
              direction="row"
              alignItems="center"
              spacing={0.75}
            >
              <Box
                component="kbd"
                sx={{
                  fontSize: "0.65rem",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  color: "text.secondary",
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.25,
                  lineHeight: 1.6,
                }}
              >
                {keys}
              </Box>
              <Typography variant="caption" color="text.disabled">
                {label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Command>
    </Dialog>
  );
}
