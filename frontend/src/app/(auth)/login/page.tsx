"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import LoginForm from "@/components/auth/LoginForm";
import { Zap, Send, Sparkles, TrendingUp } from "@/components/ui/icons";

const FEATURES = [
  {
    icon: Send,
    label: "Auto Apply",
    description: "Apply to 10× more jobs automatically",
  },
  {
    icon: Sparkles,
    label: "AI Cover Letters",
    description: "Personalized for every position",
  },
  {
    icon: TrendingUp,
    label: "Track Progress",
    description: "Dashboard analytics & status updates",
  },
];

export default function LoginPage() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* ─── Left panel ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          width: "50%",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          px: 8,
          py: 10,
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <Box
          sx={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            top: -100,
            right: -80,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            bottom: -60,
            left: -40,
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={6}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap className="h-6 w-6 text-white" />
          </Box>
          <Typography variant="h6" fontWeight={700} color="white" letterSpacing={-0.5}>
            Rolevo
          </Typography>
        </Stack>

        {/* Headline */}
        <Typography
          variant="h3"
          fontWeight={800}
          color="white"
          lineHeight={1.15}
          mb={2}
          sx={{ maxWidth: 420 }}
        >
          Land Your Dream Job with AI
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "rgba(255,255,255,0.75)", maxWidth: 400, mb: 6, lineHeight: 1.7 }}
        >
          Auto-apply to jobs with AI-generated cover letters customized for every position. Find
          matching roles, generate personalized applications, and track everything in one place.
        </Typography>

        {/* Feature cards */}
        <Stack spacing={2} width="100%" maxWidth={420}>
          {FEATURES.map(({ icon: Icon, label, description }) => (
            <Box
              key={label}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)",
                transition: "background 0.2s",
                "&:hover": { bgcolor: "rgba(255,255,255,0.13)" },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon className="h-5 w-5 text-white" />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700} color="white" lineHeight={1.3}>
                  {label}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                  {description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ─── Right panel ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, sm: 6 },
          py: 8,
          bgcolor: { xs: "background.default", lg: "background.paper" },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            mb={5}
            sx={{ display: { lg: "none" }, justifyContent: "center" }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap className="h-5 w-5 text-white" />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Rolevo
            </Typography>
          </Stack>

          <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.75}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Sign in to continue your job search
          </Typography>

          <LoginForm />
        </Box>
      </Box>
    </Box>
  );
}
