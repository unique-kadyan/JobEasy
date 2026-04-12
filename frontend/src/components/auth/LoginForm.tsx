"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { REMEMBER_ME_KEY } from "@/store/auth-store";
import TextField from "@mui/material/TextField";
import MuiButton from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { Eye, Mail, Lock } from "@/components/ui/icons";
import EyeOffIcon from "@mui/icons-material/VisibilityOff";

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill the checkbox from the last saved preference (client-side only)
  useEffect(() => {
    setRememberMe(localStorage.getItem(REMEMBER_ME_KEY) === "true");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
      {error && (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        fullWidth
        autoComplete="email"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Mail sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
      />

      <TextField
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        fullWidth
        autoComplete="current-password"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Lock sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((v) => !v)}
                  edge="end"
                  size="small"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOffIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <Eye sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
      />

      {/* Remember me + Forgot password row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mt={-1}>
        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              size="small"
              sx={{
                color: "text.disabled",
                "&.Mui-checked": { color: "primary.main" },
                p: 0.75,
              }}
            />
          }
          label={
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Remember me
            </Typography>
          }
          sx={{ m: 0, gap: 0.25 }}
        />
        <Link
          component={NextLink}
          href="/forgot-password"
          variant="caption"
          fontWeight={600}
          underline="hover"
          color="primary"
        >
          Forgot password?
        </Link>
      </Stack>

      <MuiButton
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={loading}
        disableElevation
        sx={{
          borderRadius: 2,
          py: 1.5,
          fontWeight: 600,
          fontSize: "0.9375rem",
          textTransform: "none",
          letterSpacing: 0,
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
          },
        }}
        startIcon={
          loading ? <CircularProgress size={18} color="inherit" /> : null
        }
      >
        {loading ? "Signing in…" : "Sign In"}
      </MuiButton>

      <Typography
        variant="body2"
        color="text.secondary"
        textAlign="center"
        mt={1}
      >
        Don&apos;t have an account?{" "}
        <Link
          component={NextLink}
          href="/signup"
          fontWeight={600}
          underline="hover"
          color="primary"
        >
          Sign up
        </Link>
      </Typography>
    </Stack>
  );
}
