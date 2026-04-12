"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import MuiButton from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import { Zap } from "@/components/ui/icons";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }
    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Verification failed. The link may have expired.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <Stack spacing={2} alignItems="center">
        <CircularProgress size={48} thickness={3} sx={{ color: "primary.main" }} />
        <Typography variant="body2" color="text.secondary">
          Verifying your email…
        </Typography>
      </Stack>
    );
  }

  if (status === "success") {
    return (
      <Stack spacing={3} alignItems="center">
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))",
            border: "1px solid rgba(34,197,94,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircleRoundedIcon sx={{ fontSize: 36, color: "#22c55e" }} />
        </Box>
        <Box textAlign="center">
          <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.75}>
            Email Verified!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
        <MuiButton
          component={Link}
          href="/login"
          variant="contained"
          size="large"
          disableElevation
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 4,
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            "&:hover": { background: "linear-gradient(135deg, #4338ca, #4f46e5)" },
          }}
        >
          Sign In to Your Account
        </MuiButton>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} alignItems="center">
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.08))",
          border: "1px solid rgba(239,68,68,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ErrorRoundedIcon sx={{ fontSize: 36, color: "#ef4444" }} />
      </Box>
      <Box textAlign="center">
        <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.75}>
          Verification Failed
        </Typography>
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2, mt: 1 }}>
          {message}
        </Alert>
      </Box>
      <Stack direction="row" spacing={1.5}>
        <MuiButton
          component={Link}
          href="/login"
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": { borderColor: "primary.main", color: "primary.main" },
          }}
        >
          Sign In
        </MuiButton>
        <MuiButton
          component={Link}
          href="/signup"
          variant="contained"
          disableElevation
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            "&:hover": { background: "linear-gradient(135deg, #4338ca, #4f46e5)" },
          }}
        >
          Sign Up Again
        </MuiButton>
      </Stack>
    </Stack>
  );
}

export default function VerifyEmailPage() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <Stack direction="row" alignItems="center" spacing={1.5} justifyContent="center" mb={4}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
            }}
          >
            <Zap style={{ fontSize: 20, color: "white" }} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary" letterSpacing={-0.5}>
            Rolevo
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            p: 5,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            bgcolor: "background.paper",
          }}
        >
          <Suspense
            fallback={
              <Stack spacing={2} alignItems="center">
                <CircularProgress size={48} thickness={3} sx={{ color: "primary.main" }} />
                <Typography variant="body2" color="text.secondary">Loading…</Typography>
              </Stack>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </Paper>
      </Box>
    </Box>
  );
}
