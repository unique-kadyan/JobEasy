"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import MuiButton from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";

import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";

import { Zap } from "@/components/ui/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedResume {
  title?: string;
  experienceYears?: number;
  skills?: Record<string, string[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_ROLES = [
  "Software Engineer", "Full Stack Developer", "Frontend Developer",
  "Backend Developer", "React Developer", "Node.js Developer",
  "Python Developer", "Java Developer", "DevOps Engineer",
  "Data Engineer", "ML Engineer", "Mobile Developer",
  "Android Developer", "iOS Developer", "Data Scientist",
  "Cloud Engineer", "Product Manager", "QA Engineer", "Tech Lead",
];

const WORK_PREFS = [
  { value: "REMOTE",  label: "Remote" },
  { value: "HYBRID",  label: "Hybrid" },
  { value: "ONSITE",  label: "On-site" },
];

// Derive role suggestions from parsed resume skills
function suggestRoles(parsed: ParsedResume | null): string[] {
  if (!parsed?.skills) return [];
  const all = Object.values(parsed.skills).flat().map((s) => s.toLowerCase());
  const has = (...terms: string[]) => terms.some((t) => all.some((s) => s.includes(t)));
  const out: string[] = [];
  if (parsed.title) out.push(parsed.title);
  if (has("react")) out.push("React Developer", "Frontend Developer");
  if (has("vue"))   out.push("Vue Developer", "Frontend Developer");
  if (has("angular")) out.push("Angular Developer", "Frontend Developer");
  if (has("node", "express", "nestjs")) out.push("Node.js Developer", "Backend Developer");
  if (has("python", "django", "fastapi", "flask")) out.push("Python Developer", "Backend Developer");
  if (has("java", "spring")) out.push("Java Developer", "Backend Engineer");
  if (has("kotlin", "android")) out.push("Android Developer", "Mobile Developer");
  if (has("swift", "ios")) out.push("iOS Developer", "Mobile Developer");
  if (has("docker", "kubernetes", "terraform")) out.push("DevOps Engineer", "Cloud Engineer");
  if (has("tensorflow", "pytorch", "sklearn")) out.push("ML Engineer", "Data Scientist");
  if (has("spark", "kafka", "airflow")) out.push("Data Engineer");
  if (has("typescript", "javascript") && has("node") && has("react")) out.push("Full Stack Developer");
  // de-duplicate
  return [...new Set(out)].slice(0, 6);
}

// ─── Left-panel metadata (changes per step) ───────────────────────────────────

const PANELS = [
  {
    gradient: "linear-gradient(150deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)",
    headline: "Let AI read your resume",
    sub: "Upload once — we extract your skills, experience and contact info. No form-filling ever again.",
    bullets: [
      "Auto-detects skills & technologies",
      "Powers every AI cover letter",
      "Enables Smart Resume builder",
    ],
  },
  {
    gradient: "linear-gradient(150deg, #7c3aed 0%, #8b5cf6 55%, #a78bfa 100%)",
    headline: "What's your dream role?",
    sub: "We scan 50+ job boards and surface roles that match exactly what you're looking for.",
    bullets: [
      "Personalised job feed every time",
      "Location & remote preference filters",
      "Role-matched AI applications",
    ],
  },
  {
    gradient: "linear-gradient(150deg, #0f766e 0%, #0d9488 55%, #2dd4bf 100%)",
    headline: "Your AI assistant is ready",
    sub: "Everything is set up. Start applying smarter — not harder.",
    bullets: [
      "Search jobs from Indeed & LinkedIn",
      "Generate cover letters in seconds",
      "Track all applications in one place",
    ],
  },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 44 : -44, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -44 : 44, opacity: 0 }),
};

const transition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

// ─── Page component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState(1);

  // Step 0 — Resume upload state
  const [drag,        setDrag]        = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "parsing" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [parseLog,    setParseLog]    = useState<string[]>([]);
  const [parsed,      setParsed]      = useState<ParsedResume | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1 — Preferences state
  const [roles,      setRoles]      = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [location,   setLocation]   = useState(user?.location ?? "");
  const [workPref,   setWorkPref]   = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Step 2 — Complete state
  const [completing, setCompleting] = useState(false);

  const go = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); };

  // ── Resume upload ────────────────────────────────────────────────────────────

  const runParseAnim = useCallback((data: ParsedResume) => {
    const msgs: string[] = ["Reading document structure…"];
    const allSkills = data.skills ? Object.values(data.skills).flat() : [];
    if (allSkills.length) msgs.push(`Detected ${allSkills.length} skills & technologies…`);
    if (data.experienceYears) msgs.push(`Found ${data.experienceYears} years of experience…`);
    if (data.title) msgs.push(`Identified role: ${data.title}`);
    msgs.push("Pre-filling your job preferences…");

    let i = 0;
    const tick = () => {
      if (i < msgs.length) {
        setParseLog((p) => [...p, msgs[i++]]);
        setTimeout(tick, 560);
      } else {
        setTimeout(() => {
          setUploadState("done");
          setRoles(suggestRoles(data));
        }, 350);
      }
    };
    tick();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setUploadState("uploading");
    setUploadError("");
    setParseLog([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/resumes/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data: ParsedResume = {
        title:           res.data?.parsedData?.experience?.[0]?.title,
        experienceYears: res.data?.parsedData?.experienceYears,
        skills:          res.data?.parsedData?.skills,
      };
      setParsed(data);
      setUploadState("parsing");
      runParseAnim(data);
    } catch {
      setUploadState("error");
      setUploadError("Upload failed. Check the file and try again.");
    }
  }, [runParseAnim]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Save preferences ─────────────────────────────────────────────────────────

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const body: Record<string, unknown> = {};
      if (roles.length)         body.targetRoles    = roles;
      if (location.trim())      body.location       = location.trim();
      if (workPref)             body.workPreference = workPref;
      await api.put("/users/profile", body);
    } catch { /* non-critical */ } finally {
      setSavingPrefs(false);
      go(2);
    }
  };

  // ── Complete onboarding ───────────────────────────────────────────────────────

  const handleComplete = async (dest = "/dashboard") => {
    setCompleting(true);
    try {
      const res = await api.post("/users/onboarding/complete");
      if (user) setUser({ ...user, ...res.data, onboardingCompleted: true });
    } catch {
      if (user) setUser({ ...user, onboardingCompleted: true });
    } finally {
      router.push(dest);
    }
  };

  const panel = PANELS[step];
  const progress = ((step + 1) / PANELS.length) * 100;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>

      {/* ── Left brand panel ──────────────────────────────────────────────── */}
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          width: "42%",
          flexShrink: 0,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          px: 7,
          py: 8,
          position: "relative",
          overflow: "hidden",
          background: panel.gradient,
          transition: "background 0.55s ease",
        }}
      >
        {/* Decorative blobs */}
        <Box sx={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -80, right: -60, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: -50, left: -30, pointerEvents: "none" }} />

        {/* Logo */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={7}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap className="h-5 w-5 text-white" />
          </Box>
          <Typography variant="h6" fontWeight={700} color="white" letterSpacing={-0.5}>Rolevo</Typography>
          <Chip label="AI" size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 700, fontSize: "0.6rem", height: 20, letterSpacing: 1, "& .MuiChip-label": { px: 1 } }} />
        </Stack>

        {/* Per-step content — animates in/out */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={transition}
            style={{ width: "100%" }}
          >
            <Typography variant="h3" fontWeight={800} color="white" lineHeight={1.15} mb={1.5} sx={{ maxWidth: 380 }}>
              {panel.headline}
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.75)", maxWidth: 360, mb: 5, lineHeight: 1.7 }}>
              {panel.sub}
            </Typography>
            <Stack spacing={1.5} sx={{ maxWidth: 360 }}>
              {panel.bullets.map((b, i) => (
                <motion.div
                  key={b}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, ...transition }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)" }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.85)", flexShrink: 0 }} />
                    <Typography variant="body2" fontWeight={500} color="white">{b}</Typography>
                  </Stack>
                </motion.div>
              ))}
            </Stack>
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <Stack direction="row" spacing={1} sx={{ position: "absolute", bottom: 40, left: 56 }}>
          {PANELS.map((_, i) => (
            <Box
              key={i}
              sx={{
                height: 8,
                width: i === step ? 28 : 8,
                borderRadius: 4,
                bgcolor: i === step ? "white" : "rgba(255,255,255,0.3)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* ── Right content panel ───────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, sm: 5 },
          py: 6,
          overflowY: "auto",
        }}
      >
        {/* Mobile logo */}
        <Stack direction="row" alignItems="center" spacing={1} mb={4} sx={{ display: { lg: "none" } }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, background: "linear-gradient(135deg, #4f46e5, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap style={{ fontSize: 16, color: "white" }} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">Rolevo</Typography>
        </Stack>

        {/* Progress */}
        <Box sx={{ width: "100%", maxWidth: 460, mb: 5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Step {step + 1} of {PANELS.length}
            </Typography>
            <Typography variant="caption" color="primary.main" fontWeight={700}>
              {Math.round(progress)}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #4f46e5, #6366f1)",
                borderRadius: 2,
                transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)",
              },
            }}
          />
        </Box>

        {/* Animated step content */}
        <Box sx={{ width: "100%", maxWidth: 460 }}>
          <AnimatePresence mode="wait" custom={dir}>
            {step === 0 && (
              <motion.div key="upload" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={transition}>
                <StepUpload
                  firstName={firstName}
                  drag={drag}
                  setDrag={setDrag}
                  uploadState={uploadState}
                  uploadError={uploadError}
                  parseLog={parseLog}
                  parsed={parsed}
                  fileRef={fileRef}
                  onFile={handleFile}
                  onDrop={handleDrop}
                  onContinue={() => go(1)}
                />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="prefs" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={transition}>
                <StepPreferences
                  roles={roles}
                  setRoles={setRoles}
                  customRole={customRole}
                  setCustomRole={setCustomRole}
                  location={location}
                  setLocation={setLocation}
                  workPref={workPref}
                  setWorkPref={setWorkPref}
                  saving={savingPrefs}
                  onBack={() => go(0)}
                  onContinue={handleSavePrefs}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="done" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={transition}>
                <StepComplete
                  firstName={firstName}
                  completing={completing}
                  onNavigate={handleComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Step 0: Resume upload ────────────────────────────────────────────────────

interface StepUploadProps {
  firstName: string;
  drag: boolean;
  setDrag: (v: boolean) => void;
  uploadState: "idle" | "uploading" | "parsing" | "done" | "error";
  uploadError: string;
  parseLog: string[];
  parsed: ParsedResume | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onContinue: () => void;
}

function StepUpload({ firstName, drag, setDrag, uploadState, uploadError, parseLog, parsed, fileRef, onFile, onDrop, onContinue }: StepUploadProps) {
  const busy = uploadState === "uploading" || uploadState === "parsing";

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.5}>
          Hey {firstName}, let&apos;s start with your resume
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
          Upload once — we power everything from it. Your cover letters, job matching, and smart resume all read from this file.
        </Typography>
      </Box>

      {/* Drop zone — shown when idle or error */}
      {(uploadState === "idle" || uploadState === "error") && (
        <Box
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          sx={{
            border: "2px dashed",
            borderColor: drag ? "primary.main" : "divider",
            borderRadius: 3,
            py: 5,
            px: 3,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: drag ? "rgba(99,102,241,0.05)" : "action.hover",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "rgba(99,102,241,0.05)",
              "& .upload-icon": { color: "primary.main", transform: "translateY(-3px)" },
            },
          }}
        >
          <CloudUploadRoundedIcon
            className="upload-icon"
            sx={{ fontSize: 44, color: drag ? "primary.main" : "text.disabled", mb: 1.5, transition: "all 0.2s ease" }}
          />
          <Typography variant="body1" fontWeight={600} color="text.primary" mb={0.5}>
            {drag ? "Drop it here!" : "Drag & drop your resume"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            or click to browse &nbsp;·&nbsp; PDF, DOC, DOCX &nbsp;·&nbsp; up to 10 MB
          </Typography>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </Box>
      )}

      {/* Uploading spinner */}
      {uploadState === "uploading" && (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 4, textAlign: "center", bgcolor: "action.hover" }}>
          <CircularProgress size={36} thickness={3.5} sx={{ mb: 2, color: "primary.main" }} />
          <Typography variant="body2" color="text.secondary">Uploading your resume…</Typography>
        </Box>
      )}

      {/* Parse animation + done state */}
      {(uploadState === "parsing" || uploadState === "done") && (
        <Box
          sx={{
            border: "1px solid",
            borderColor: uploadState === "done" ? "success.light" : "divider",
            borderRadius: 3,
            p: 3,
            bgcolor: uploadState === "done" ? "rgba(34,197,94,0.04)" : "action.hover",
            transition: "border-color 0.4s ease, background-color 0.4s ease",
          }}
        >
          <Stack spacing={1.25}>
            {parseLog.map((msg, i) => {
              const isDone = i < parseLog.length - 1 || uploadState === "done";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    {isDone
                      ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: "success.main", flexShrink: 0 }} />
                      : <CircularProgress size={14} thickness={4} sx={{ flexShrink: 0 }} />
                    }
                    <Typography variant="body2" color={isDone ? "text.primary" : "text.secondary"} fontWeight={isDone ? 500 : 400}>
                      {msg}
                    </Typography>
                  </Stack>
                </motion.div>
              );
            })}

            {uploadState === "done" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Divider sx={{ my: 0.5 }} />
                <Alert
                  severity="success"
                  variant="outlined"
                  sx={{ borderRadius: 2, mt: 0.75 }}
                  icon={<CheckCircleRoundedIcon sx={{ fontSize: 18 }} />}
                >
                  {parsed?.skills
                    ? `${Object.values(parsed.skills).flat().length} skills detected — job preferences pre-filled.`
                    : "Resume parsed successfully!"}
                </Alert>
              </motion.div>
            )}
          </Stack>
        </Box>
      )}

      {uploadError && (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>{uploadError}</Alert>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={1.5}>
        {!busy && uploadState !== "done" && (
          <MuiButton
            variant="text"
            onClick={onContinue}
            sx={{ borderRadius: 2, textTransform: "none", color: "text.secondary", fontWeight: 500 }}
          >
            Skip for now
          </MuiButton>
        )}
        <MuiButton
          variant="contained"
          onClick={onContinue}
          disabled={busy}
          disableElevation
          endIcon={busy ? <CircularProgress size={16} color="inherit" /> : <ChevronRightRoundedIcon />}
          sx={{
            flex: 1,
            borderRadius: 2,
            py: 1.4,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.9375rem",
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            "&:hover": { background: "linear-gradient(135deg, #4338ca, #4f46e5)" },
          }}
        >
          {busy ? "Processing…" : uploadState === "done" ? "Continue →" : "Continue without resume"}
        </MuiButton>
      </Stack>
    </Stack>
  );
}

// ─── Step 1: Job preferences ──────────────────────────────────────────────────

interface StepPrefsProps {
  roles: string[];
  setRoles: (r: string[]) => void;
  customRole: string;
  setCustomRole: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  workPref: string | null;
  setWorkPref: (v: string | null) => void;
  saving: boolean;
  onBack: () => void;
  onContinue: () => void;
}

function StepPreferences({ roles, setRoles, customRole, setCustomRole, location, setLocation, workPref, setWorkPref, saving, onBack, onContinue }: StepPrefsProps) {
  const toggle = (role: string) =>
    setRoles(roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]);

  const addCustom = () => {
    const v = customRole.trim();
    if (v && !roles.includes(v)) setRoles([...roles, v]);
    setCustomRole("");
  };

  // Show pre-suggested (pre-selected) roles first, then fill with common roles
  const pool = [...new Set([...roles, ...COMMON_ROLES])].slice(0, 18);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.5}>
          What roles are you targeting?
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
          {roles.length > 0
            ? "We pre-filled these from your resume — adjust to your taste."
            : "Select everything that interests you — you can always update this later."}
        </Typography>
      </Box>

      {/* Role chips */}
      <Box>
        <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ display: "block", mb: 1.5, letterSpacing: 0.8, fontSize: "0.65rem" }}>
          ROLES {roles.length > 0 && `· ${roles.length} selected`}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {pool.map((role) => {
            const active = roles.includes(role);
            return (
              <Chip
                key={role}
                label={role}
                onClick={() => toggle(role)}
                variant={active ? "filled" : "outlined"}
                sx={{
                  borderRadius: 2,
                  fontWeight: active ? 600 : 500,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  bgcolor: active ? "primary.main" : "transparent",
                  color: active ? "white" : "text.secondary",
                  borderColor: active ? "primary.main" : "divider",
                  "&:hover": {
                    bgcolor: active ? "primary.dark" : "rgba(99,102,241,0.06)",
                    borderColor: "primary.main",
                  },
                }}
              />
            );
          })}
        </Box>

        {/* Add custom role */}
        <Stack direction="row" spacing={1} mt={1.5}>
          <TextField
            size="small"
            placeholder="Add a custom role…"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><DescriptionRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} /></InputAdornment> } }}
          />
          <MuiButton
            variant="outlined"
            onClick={addCustom}
            disabled={!customRole.trim()}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, minWidth: 64, borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "primary.main", color: "primary.main" } }}
          >
            Add
          </MuiButton>
        </Stack>
      </Box>

      {/* Work preference chips */}
      <Box>
        <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ display: "block", mb: 1.5, letterSpacing: 0.8, fontSize: "0.65rem" }}>
          WORK PREFERENCE
        </Typography>
        <Stack direction="row" spacing={1}>
          {WORK_PREFS.map((pref) => {
            const active = workPref === pref.value;
            return (
              <Chip
                key={pref.value}
                label={pref.label}
                onClick={() => setWorkPref(active ? null : pref.value)}
                variant={active ? "filled" : "outlined"}
                sx={{
                  borderRadius: 2,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  bgcolor: active ? "primary.main" : "transparent",
                  color: active ? "white" : "text.secondary",
                  borderColor: active ? "primary.main" : "divider",
                  "&:hover": { borderColor: "primary.main", color: active ? "white" : "primary.main" },
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* Location */}
      <TextField
        label="Preferred location"
        placeholder="e.g. Bangalore, Remote, United States"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        size="small"
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <LocationOnRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
      />

      {/* Navigation */}
      <Stack direction="row" spacing={1.5}>
        <MuiButton
          variant="outlined"
          startIcon={<ChevronLeftRoundedIcon />}
          onClick={onBack}
          sx={{ borderRadius: 2, py: 1.25, textTransform: "none", fontWeight: 600, borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "primary.main", color: "primary.main" } }}
        >
          Back
        </MuiButton>
        <MuiButton
          variant="contained"
          fullWidth
          onClick={onContinue}
          disabled={saving}
          disableElevation
          endIcon={saving ? <CircularProgress size={16} color="inherit" /> : <ChevronRightRoundedIcon />}
          sx={{
            borderRadius: 2, py: 1.4,
            textTransform: "none", fontWeight: 600, fontSize: "0.9375rem",
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            "&:hover": { background: "linear-gradient(135deg, #4338ca, #4f46e5)" },
          }}
        >
          {saving ? "Saving…" : "Save & Continue"}
        </MuiButton>
      </Stack>
    </Stack>
  );
}

// ─── Step 2: Celebration + launch ────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Search Jobs",    desc: "Browse 50+ job boards now",         href: "/jobs",         Icon: SearchRoundedIcon,      color: "#3b82f6" },
  { label: "Smart Resume",   desc: "Let AI optimise your resume",        href: "/smart-resume", Icon: AutoAwesomeRoundedIcon, color: "#8b5cf6" },
  { label: "Dashboard",      desc: "See your overview & analytics",      href: "/dashboard",    Icon: DashboardRoundedIcon,   color: "#10b981" },
];

function StepComplete({ firstName, completing, onNavigate }: { firstName: string; completing: boolean; onNavigate: (href: string) => void }) {
  return (
    <Stack spacing={4} alignItems="center">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
      >
        <Box
          sx={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
            border: "2px solid rgba(99,102,241,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(99,102,241,0.18)",
          }}
        >
          <RocketLaunchRoundedIcon sx={{ fontSize: 40, color: "primary.main" }} />
        </Box>
      </motion.div>

      {/* Headline */}
      <Box textAlign="center">
        <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.75}>
          You&apos;re all set, {firstName}!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, lineHeight: 1.7 }}>
          Your AI job search assistant is ready. Where do you want to start?
        </Typography>
      </Box>

      {/* Quick-start action cards */}
      <Stack spacing={1.5} width="100%">
        {QUICK_ACTIONS.map(({ label, desc, href, Icon, color }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.09, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Box
              component="button"
              onClick={() => !completing && onNavigate(href)}
              disabled={completing}
              sx={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 2,
                p: 2, borderRadius: 2.5,
                border: "1px solid", borderColor: "divider",
                bgcolor: "background.paper",
                cursor: completing ? "not-allowed" : "pointer",
                textAlign: "left",
                opacity: completing ? 0.6 : 1,
                transition: "all 0.18s ease",
                "&:hover:not(:disabled)": {
                  borderColor: color,
                  bgcolor: `${color}0a`,
                  transform: "translateX(4px)",
                  boxShadow: `0 4px 16px ${color}22`,
                },
              }}
            >
              <Box
                sx={{
                  width: 46, height: 46, borderRadius: 2,
                  bgcolor: `${color}14`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s ease",
                }}
              >
                <Icon sx={{ fontSize: 22, color }} />
              </Box>
              <Box flex={1}>
                <Typography variant="body2" fontWeight={600} color="text.primary">{label}</Typography>
                <Typography variant="caption" color="text.secondary">{desc}</Typography>
              </Box>
              <ChevronRightRoundedIcon sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0 }} />
            </Box>
          </motion.div>
        ))}
      </Stack>

      {completing && (
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <CircularProgress size={15} thickness={4} />
          <Typography variant="caption" color="text.secondary">Setting up your dashboard…</Typography>
        </Stack>
      )}
    </Stack>
  );
}
