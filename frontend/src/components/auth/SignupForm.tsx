"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";
import TextField from "@mui/material/TextField";
import MuiButton from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { Eye, Mail, Lock, User } from "@/components/ui/icons";
import EyeOffIcon from "@mui/icons-material/VisibilityOff";

export default function SignupForm() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Signup failed. Please try again."
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
        label="Full Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        required
        fullWidth
        autoComplete="name"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <User sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
      />

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
        placeholder="Min 6 characters"
        required
        fullWidth
        autoComplete="new-password"
        inputProps={{ minLength: 6 }}
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
        {loading ? "Creating account…" : "Create Account"}
      </MuiButton>

      <Typography
        variant="body2"
        color="text.secondary"
        textAlign="center"
        mt={1}
      >
        Already have an account?{" "}
        <Link
          component={NextLink}
          href="/login"
          fontWeight={600}
          underline="hover"
          color="primary"
        >
          Sign in
        </Link>
      </Typography>
    </Stack>
  );
}
