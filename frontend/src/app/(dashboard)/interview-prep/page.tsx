"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  InterviewCategory,
  InterviewMode,
  MockInterviewQA,
  MockInterviewSession,
} from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { getTierFeatures } from "@/lib/tier-features";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import {
  MessageSquare,
  Play,
  CheckCircle,
  Clock,
  Star,
  ChevronDown,
  Lock,
  Trophy,
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Keyboard,
  ChevronRight,
  ChevronLeft,
  Target,
  ListChecks,
  TrendingUp,
  AlertTriangle,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "mode" | "list" | "setup" | "interview" | "results";

// ─── Constants ──────────────────────────────────────────────────────────────

const DIFFICULTY_OPTS = [
  { value: "ENTRY", label: "Entry Level", desc: "0–2 yrs" },
  { value: "MID", label: "Mid Level", desc: "2–5 yrs" },
  { value: "SENIOR", label: "Senior", desc: "5–8 yrs" },
  { value: "LEAD", label: "Lead / Staff", desc: "8+ yrs" },
];

const CATEGORY_META: Record<InterviewCategory, { label: string; color: string }> = {
  TECHNICAL: {
    label: "Technical",
    color:
      "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  CORE_DEPTH: {
    label: "Core Depth",
    color:
      "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  BEHAVIORAL: {
    label: "Behavioral",
    color:
      "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  CULTURE_FIT: {
    label: "Culture Fit",
    color:
      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  SCENARIO_BASED: {
    label: "Scenario",
    color:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  SITUATIONAL: {
    label: "Situational",
    color:
      "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  PROBLEM_SOLVING: {
    label: "Problem Solving",
    color:
      "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  SYSTEM_DESIGN: {
    label: "System Design",
    color:
      "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
};

const MODE_CONFIG = [
  {
    id: "TEXT" as InterviewMode,
    icon: Keyboard,
    title: "Written Practice",
    subtitle: "Type your answers at your own pace",
    desc: "Ideal for preparing structured, detailed responses. Review and edit before submitting.",
    badges: ["At your pace", "Review & edit", "All questions"],
    gradient: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
    glow: "rgba(99,102,241,0.15)",
  },
  {
    id: "AUDIO" as InterviewMode,
    icon: Mic,
    title: "Voice Practice",
    subtitle: "Speak your answers aloud",
    desc: "Practice verbal communication and fluency. Speech is transcribed in real-time.",
    badges: ["Live transcription", "Verbal fluency", "One at a time"],
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
    glow: "rgba(14,165,233,0.15)",
  },
  {
    id: "VIDEO" as InterviewMode,
    icon: Video,
    title: "Video Simulation",
    subtitle: "Face the camera and speak naturally",
    desc: "Full interview simulation with video + voice. See yourself as the interviewer does.",
    badges: ["Camera + mic", "Real interview feel", "Body language"],
    gradient: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
    glow: "rgba(5,150,105,0.15)",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(pct: number) {
  if (pct >= 75) return "#16a34a";
  if (pct >= 50) return "#d97706";
  return "#dc2626";
}

function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  return (
    <span style={{ color: scoreColor(pct) }} className="text-sm font-bold tabular-nums">
      {score}/{max}
    </span>
  );
}

function CategoryChip({ category }: { category: InterviewCategory }) {
  const meta = CATEGORY_META[category] ?? {
    label: category,
    color: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.color)}>
      {meta.label}
    </span>
  );
}

// ─── SpeechRecognition hook ───────────────────────────────────────────────────

function useSpeechRecognition(onTranscript: (text: string) => void) {
  const recRef = useRef<any>(null);
  // Keep a ref to the latest callback so rec.onresult never closes over a stale version
  const callbackRef = useRef(onTranscript);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  // Sync the ref on every render (no dep array — always current)
  useEffect(() => {
    callbackRef.current = onTranscript;
  });

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  // `start` is stable — it reads from callbackRef, not onTranscript directly
  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join(" ");
      callbackRef.current(transcript); // always calls the latest handler
    };
    rec.onerror = () => setActive(false);
    rec.onend = () => setActive(false);
    rec.start();
    recRef.current = rec;
    setActive(true);
  }, []); // stable — no deps

  const stop = useCallback(() => {
    recRef.current?.stop();
    setActive(false);
  }, []);

  return { active, supported, start, stop };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function InterviewPrepPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const tier = user?.subscriptionTier ?? "FREE";
  const caps = getTierFeatures(tier);

  const [phase, setPhase] = useState<Phase>("mode");
  const [mode, setMode] = useState<InterviewMode>("TEXT");
  const [session, setSession] = useState<MockInterviewSession | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQ, setCurrentQ] = useState(0); // for audio/video: one-at-a-time nav

  // Setup form
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [difficulty, setDifficulty] = useState("MID");

  // Video
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoOn, setVideoOn] = useState(false);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      setVideoOn(true);
    } catch {
      /* user denied */
    }
  };

  const stopVideo = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVideoOn(false);
  }, []);

  // Speech recognition
  const speech = useSpeechRecognition((text) => {
    if (!session) return;
    const qa = session.questionsAndAnswers[currentQ];
    if (qa) setAnswers((prev) => ({ ...prev, [qa.index]: text }));
  });

  // Destructure stable refs so the cleanup effect doesn't re-run on every render
  const { stop: stopSpeech } = speech;

  // Cleanup on phase change — deps are all stable function references
  useEffect(() => {
    if (phase !== "interview") {
      stopSpeech();
      stopVideo();
    }
  }, [phase, stopSpeech, stopVideo]);

  // ── Queries / Mutations ───────────────────────────────────────────────────

  const { data: sessions } = useQuery<{ content: MockInterviewSession[] }>({
    queryKey: ["interview-sessions"],
    queryFn: () => api.get("/interview-prep/sessions?size=20").then((r) => r.data),
    enabled: phase === "list",
  });

  const startMutation = useMutation({
    mutationFn: () =>
      api
        .post("/interview-prep/sessions", {
          jobTitle,
          company,
          jobDescription: jobDesc,
          difficultyLevel: difficulty,
        })
        .then((r) => r.data as MockInterviewSession),
    onSuccess: (s) => {
      setSession(s);
      setAnswers({});
      setCurrentQ(0);
      setPhase("interview");
      if (mode === "VIDEO") startVideo();
    },
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/interview-prep/sessions/${session!.id}/submit`, {
          answers: Object.entries(answers).map(([idx, answer]) => ({ index: Number(idx), answer })),
        })
        .then((r) => r.data as MockInterviewSession),
    onSuccess: (s) => {
      setSession(s);
      setPhase("results");
      stopVideo();
      queryClient.invalidateQueries({ queryKey: ["interview-sessions"] });
    },
  });

  // ── Gate ──────────────────────────────────────────────────────────────────

  if (!caps.mockInterview) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 3,
          textAlign: "center",
          px: 3,
        }}
      >
        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          <Lock style={{ fontSize: 36, color: "#4f46e5" }} />
        </Box>
        <Typography variant="h6" fontWeight={700}>
          Interview Prep requires Gold or Platinum
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={360}>
          Practice with AI-powered mock interviews tailored to real roles — with voice, video, and
          gap analysis.
        </Typography>
        <Box
          component="button"
          onClick={() => (window.location.href = "/pricing")}
          sx={{
            px: 3,
            py: 1.25,
            borderRadius: 2,
            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.9rem",
          }}
        >
          Upgrade Now
        </Box>
      </Box>
    );
  }

  // ── Phase: Mode Selection ─────────────────────────────────────────────────

  if (phase === "mode") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          py: 4,
          px: 2,
        }}
      >
        {/* Header */}
        <Stack alignItems="center" spacing={1} mb={5}>
          <Typography
            variant="h4"
            fontWeight={800}
            letterSpacing={-0.5}
            textAlign="center"
            sx={{ color: "text.primary" }}
          >
            Choose Your Practice Mode
          </Typography>
          <Typography
            variant="body1"
            textAlign="center"
            maxWidth={480}
            sx={{ color: "text.primary", opacity: 0.72 }}
          >
            Real questions. Real pressure. Real confidence — pick your arena and walk into your next
            interview like you already own the room.
          </Typography>
        </Stack>

        {/* Mode cards */}
        <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 900, width: "100%" }}>
          {MODE_CONFIG.map(({ id, icon: Icon, title, subtitle, desc, badges, gradient, glow }) => (
            <Grid item xs={12} sm={4} key={id}>
              <Box
                onClick={() => {
                  setMode(id);
                  setPhase("setup");
                }}
                sx={{
                  position: "relative",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  p: 3.5,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: `0 8px 32px ${glow}`,
                    transform: "translateY(-4px)",
                  },
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    background: gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 16px ${glow}`,
                  }}
                >
                  <Icon style={{ fontSize: 24, color: "white" }} />
                </Box>

                <Box>
                  <Typography variant="h6" fontWeight={700} mb={0.5}>
                    {title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {subtitle}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                  {desc}
                </Typography>

                {/* Feature badges */}
                <Stack direction="row" flexWrap="wrap" gap={0.75} mt="auto">
                  {badges.map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      size="small"
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        height: 22,
                        bgcolor: "action.hover",
                        color: "text.secondary",
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  ))}
                </Stack>

                {/* Arrow */}
                <Box sx={{ position: "absolute", top: 16, right: 16, color: "text.disabled" }}>
                  <ChevronRight style={{ fontSize: 18 }} />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Past sessions link */}
        <Box
          component="button"
          onClick={() => setPhase("list")}
          sx={{
            mt: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "text.secondary",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": { color: "primary.main" },
          }}
        >
          <Clock style={{ fontSize: 14 }} />
          View past sessions
        </Box>
      </Box>
    );
  }

  // ── Phase: Session List ───────────────────────────────────────────────────

  if (phase === "list") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <Box sx={{ maxWidth: 720, width: "100%" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Past Sessions
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Review completed sessions or continue in-progress ones
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={() => setPhase("mode")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1.25,
                borderRadius: 2,
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              <Play style={{ fontSize: 14 }} />
              New Session
            </Box>
          </Stack>

          {!sessions?.content?.length ? (
            <Box
              sx={{
                textAlign: "center",
                py: 8,
                px: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <MessageSquare
                style={{ fontSize: 40, opacity: 0.3, display: "block", margin: "0 auto 12px" }}
              />
              <Typography fontWeight={600} mb={0.5}>
                No sessions yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start practicing to see your sessions here
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {sessions.content.map((s) => (
                <Box
                  key={s.id}
                  onClick={() => {
                    setSession(s);
                    setPhase("results");
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2.5,
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <Box>
                    <Typography fontWeight={600} fontSize="0.9rem">
                      {s.jobTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.company && `${s.company} · `}
                      {s.difficultyLevel} · {new Date(s.startedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {s.status === "COMPLETED" ? (
                      <>
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle style={{ fontSize: 13 }} /> Done
                        </span>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography
                            fontWeight={800}
                            fontSize="1.1rem"
                            color={scoreColor(s.overallScore)}
                          >
                            {s.overallScore}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            / 100
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Clock style={{ fontSize: 13 }} /> In Progress
                      </span>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    );
  }

  // ── Phase: Setup ──────────────────────────────────────────────────────────

  if (phase === "setup") {
    const modeInfo = MODE_CONFIG.find((m) => m.id === mode)!;
    const ModeIcon = modeInfo.icon;
    return (
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <Box sx={{ maxWidth: 560, width: "100%" }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
            <IconButton size="small" onClick={() => setPhase("mode")}>
              <ArrowLeft style={{ fontSize: 16 }} />
            </IconButton>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h5" fontWeight={700}>
                  Set Up Session
                </Typography>
                <Chip
                  icon={<ModeIcon style={{ fontSize: 12 }} />}
                  label={modeInfo.title}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    height: 22,
                    background: modeInfo.gradient,
                    color: "white",
                    "& .MuiChip-label": { px: 1 },
                    "& .MuiChip-icon": { color: "white !important", ml: 0.5 },
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Tell us about the role you&apos;re preparing for
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              p: 3,
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
            }}
          >
            <TextField
              label="Job Title *"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              size="small"
              fullWidth
            />
            <TextField
              label="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Google"
              size="small"
              fullWidth
            />
            <TextField
              label="Job Description (optional — helps tailor questions)"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the job description here…"
              multiline
              rows={4}
              size="small"
              fullWidth
            />

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                mb={1}
                display="block"
              >
                Experience Level
              </Typography>
              <Grid container spacing={1}>
                {DIFFICULTY_OPTS.map((opt) => (
                  <Grid item xs={6} key={opt.value}>
                    <Box
                      onClick={() => setDifficulty(opt.value)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: difficulty === opt.value ? "primary.main" : "divider",
                        bgcolor: difficulty === opt.value ? "rgba(99,102,241,0.06)" : "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={difficulty === opt.value ? "primary" : "text.primary"}
                        display="block"
                      >
                        {opt.label}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {opt.desc}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box
              component="button"
              disabled={!jobTitle.trim() || startMutation.isPending}
              onClick={() => startMutation.mutate()}
              sx={{
                mt: 0.5,
                py: 1.5,
                borderRadius: 2,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                opacity: !jobTitle.trim() || startMutation.isPending ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {startMutation.isPending ? (
                <>
                  <CircularProgress size={16} sx={{ color: "white" }} /> Generating Questions…
                </>
              ) : (
                <>
                  <Play style={{ fontSize: 16 }} /> Start Interview
                </>
              )}
            </Box>

            {startMutation.isError && (
              <Typography variant="caption" color="error">
                {(startMutation.error as any)?.response?.data?.message ??
                  "Failed to start session. Please try again."}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Phase: Interview ──────────────────────────────────────────────────────

  if (phase === "interview" && session) {
    const qaList = session.questionsAndAnswers ?? [];
    const answered = qaList.filter((q) => (answers[q.index] ?? "").trim().length > 0).length;
    const isAV = mode === "AUDIO" || mode === "VIDEO";
    const curQA: MockInterviewQA | undefined = isAV ? qaList[currentQ] : undefined;

    // ── AV mode: one question at a time ───────────────────────────────────
    if (isAV && curQA) {
      const progress = ((currentQ + 1) / qaList.length) * 100;
      const curAnswer = answers[curQA.index] ?? "";
      const isLast = currentQ === qaList.length - 1;

      return (
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Box
            sx={{
              maxWidth: 680,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
            }}
          >
            {/* Progress bar */}
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.75}>
                <Typography variant="caption" color="text.secondary">
                  Question {currentQ + 1} of {qaList.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {answered} answered
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  borderRadius: 4,
                  height: 5,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": {
                    background: "linear-gradient(90deg,#4f46e5,#6366f1)",
                  },
                }}
              />
            </Box>

            {/* Video preview (VIDEO mode) */}
            {mode === "VIDEO" && (
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 3,
                  overflow: "hidden",
                  bgcolor: "#000",
                  aspectRatio: "16/5",
                  maxHeight: 200,
                }}
              >
                {videoOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: 1,
                    }}
                  >
                    <VideoOff style={{ fontSize: 28, color: "#6b7280" }} />
                    <Typography variant="caption" color="text.disabled">
                      Camera off
                    </Typography>
                  </Box>
                )}
                <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                  <IconButton
                    size="small"
                    onClick={videoOn ? stopVideo : startVideo}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.5)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                    }}
                  >
                    {videoOn ? (
                      <Video style={{ fontSize: 16 }} />
                    ) : (
                      <VideoOff style={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* Question card */}
            <Box
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                p: 3.5,
              }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: "rgba(99,102,241,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="caption" fontWeight={800} color="primary">
                    {currentQ + 1}
                  </Typography>
                </Box>
                <CategoryChip category={curQA.category} />
              </Stack>
              <Typography variant="h6" fontWeight={600} lineHeight={1.5} mb={3}>
                {curQA.question}
              </Typography>

              {/* Answer area */}
              <TextField
                multiline
                rows={4}
                fullWidth
                size="small"
                placeholder={
                  speech.active
                    ? "Listening… speak your answer"
                    : "Your answer will appear here as you speak, or type directly…"
                }
                value={curAnswer}
                onChange={(e) => setAnswers((p) => ({ ...p, [curQA.index]: e.target.value }))}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    ...(speech.active && {
                      borderColor: "error.main",
                      "& fieldset": { borderColor: "#ef4444", borderWidth: 2 },
                    }),
                  },
                }}
              />

              {/* Controls */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" mt={2.5}>
                <Stack direction="row" spacing={1}>
                  {/* Mic button */}
                  {speech.supported ? (
                    <Tooltip title={speech.active ? "Stop recording" : "Start recording"}>
                      <IconButton
                        onClick={speech.active ? speech.stop : speech.start}
                        sx={{
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: speech.active ? "error.main" : "divider",
                          bgcolor: speech.active ? "rgba(239,68,68,0.08)" : "transparent",
                          color: speech.active ? "error.main" : "text.secondary",
                          px: 1.5,
                          gap: 0.75,
                          "&:hover": {
                            bgcolor: speech.active ? "rgba(239,68,68,0.12)" : "action.hover",
                          },
                        }}
                      >
                        {speech.active ? (
                          <>
                            <MicOff style={{ fontSize: 16 }} />
                            <Typography variant="caption" fontWeight={600} color="error">
                              Stop
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Mic style={{ fontSize: 16 }} />
                            <Typography variant="caption" fontWeight={600}>
                              Record
                            </Typography>
                          </>
                        )}
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Speech recognition not supported in this browser">
                      <span>
                        <IconButton
                          disabled
                          sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}
                        >
                          <MicOff style={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  {currentQ > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => setCurrentQ((p) => p - 1)}
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                    >
                      <ChevronLeft style={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  {!isLast ? (
                    <Box
                      component="button"
                      onClick={() => setCurrentQ((p) => p + 1)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                      }}
                    >
                      Next <ChevronRight style={{ fontSize: 14 }} />
                    </Box>
                  ) : (
                    <Box
                      component="button"
                      disabled={answered === 0 || submitMutation.isPending}
                      onClick={() => submitMutation.mutate()}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 2.5,
                        py: 0.85,
                        borderRadius: 2,
                        background: "linear-gradient(135deg,#059669,#34d399)",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        opacity: answered === 0 || submitMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {submitMutation.isPending ? (
                        <>
                          <CircularProgress size={14} sx={{ color: "white" }} /> Evaluating…
                        </>
                      ) : (
                        <>
                          <Send style={{ fontSize: 14 }} /> Submit & Get Feedback
                        </>
                      )}
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Box>

            {/* Questions overview dots */}
            <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={0.5}>
              {qaList.map((q, i) => (
                <Tooltip
                  key={q.index}
                  title={`Q${i + 1}: ${CATEGORY_META[q.category]?.label ?? q.category}`}
                >
                  <Box
                    onClick={() => setCurrentQ(i)}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      bgcolor:
                        i === currentQ
                          ? "primary.main"
                          : (answers[q.index] ?? "").trim()
                            ? "rgba(99,102,241,0.2)"
                            : "action.hover",
                      color:
                        i === currentQ
                          ? "white"
                          : (answers[q.index] ?? "").trim()
                            ? "primary.main"
                            : "text.disabled",
                      border: i === currentQ ? "2px solid" : "1px solid",
                      borderColor: i === currentQ ? "primary.main" : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    {i + 1}
                  </Box>
                </Tooltip>
              ))}
            </Stack>
          </Box>
        </Box>
      );
    }

    // ── TEXT mode: all questions ───────────────────────────────────────────
    return (
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <Box sx={{ maxWidth: 720, width: "100%" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {session.jobTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {session.company && `${session.company} · `}
                {session.difficultyLevel} · {answered}/{qaList.length} answered
              </Typography>
            </Box>
            <Box
              component="button"
              disabled={answered === 0 || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 2.5,
                py: 1,
                borderRadius: 2,
                background: "linear-gradient(135deg,#059669,#34d399)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.82rem",
                opacity: answered === 0 || submitMutation.isPending ? 0.5 : 1,
              }}
            >
              {submitMutation.isPending ? (
                <>
                  <CircularProgress size={13} sx={{ color: "white" }} /> Evaluating…
                </>
              ) : (
                <>
                  <Send style={{ fontSize: 13 }} /> Submit &amp; Get Feedback
                </>
              )}
            </Box>
          </Stack>

          <Stack spacing={2}>
            {qaList.map((qa) => (
              <Box
                key={qa.index}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  p: 3,
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      bgcolor: "rgba(99,102,241,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <Typography variant="caption" fontWeight={800} color="primary">
                      {qa.index}
                    </Typography>
                  </Box>
                  <Box flex={1}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <CategoryChip category={qa.category} />
                    </Stack>
                    <Typography variant="body2" fontWeight={600} mb={1.5} lineHeight={1.6}>
                      {qa.question}
                    </Typography>
                    <TextField
                      multiline
                      rows={3}
                      fullWidth
                      size="small"
                      placeholder="Type your answer here…"
                      value={answers[qa.index] ?? ""}
                      onChange={(e) => setAnswers((p) => ({ ...p, [qa.index]: e.target.value }))}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>

          {submitMutation.isError && (
            <Typography variant="caption" color="error" mt={2} display="block">
              Submission failed. Please try again.
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // ── Phase: Results ────────────────────────────────────────────────────────

  if (phase === "results" && session) {
    const qaList = session.questionsAndAnswers ?? [];
    const pct = session.overallScore;

    return (
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <Box sx={{ maxWidth: 760, width: "100%" }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
            <IconButton size="small" onClick={() => setPhase("list")}>
              <ArrowLeft style={{ fontSize: 16 }} />
            </IconButton>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={700}>
                {session.jobTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {session.company && `${session.company} · `}
                {session.difficultyLevel}
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={() => {
                setSession(null);
                setPhase("mode");
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 2,
                py: 0.75,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "transparent",
                color: "text.secondary",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              <Play style={{ fontSize: 13 }} /> Practice Again
            </Box>
          </Stack>

          {session.status === "IN_PROGRESS" && (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Clock
                style={{ fontSize: 32, color: "#d97706", display: "block", margin: "0 auto 12px" }}
              />
              <Typography fontWeight={600} mb={0.5}>
                Session In Progress
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Continue answering and submit when ready.
              </Typography>
              <Box
                component="button"
                onClick={() => {
                  setAnswers({});
                  setCurrentQ(0);
                  setPhase("interview");
                }}
                sx={{
                  px: 2.5,
                  py: 1,
                  borderRadius: 2,
                  background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Continue
              </Box>
            </Box>
          )}

          {session.status === "COMPLETED" && (
            <Stack spacing={2.5}>
              {/* ── Overall Score ── */}
              <Box
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  p: 3,
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={3}
                  alignItems={{ sm: "center" }}
                >
                  {/* Score circle */}
                  <Box
                    sx={{
                      position: "relative",
                      width: 100,
                      height: 100,
                      flexShrink: 0,
                      mx: { xs: "auto", sm: 0 },
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={pct}
                      size={100}
                      thickness={5}
                      sx={{
                        color: scoreColor(pct),
                        "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
                      }}
                    />
                    <CircularProgress
                      variant="determinate"
                      value={100}
                      size={100}
                      thickness={5}
                      sx={{ color: "action.hover", position: "absolute", top: 0, left: 0 }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trophy style={{ fontSize: 14, color: "#f59e0b" }} />
                      <Typography
                        fontWeight={900}
                        fontSize="1.4rem"
                        lineHeight={1}
                        color={scoreColor(pct)}
                      >
                        {pct}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" lineHeight={1}>
                        /100
                      </Typography>
                    </Box>
                  </Box>

                  <Box flex={1}>
                    <Typography fontWeight={700} mb={0.5}>
                      Overall Performance
                    </Typography>
                    {session.overallFeedback && (
                      <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                        {session.overallFeedback}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                {(session.strengths || session.improvements) && (
                  <Grid container spacing={1.5} mt={1.5}>
                    {session.strengths && (
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(22,163,74,0.06)",
                            border: "1px solid rgba(22,163,74,0.2)",
                          }}
                        >
                          <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75}>
                            <CheckCircle style={{ fontSize: 13, color: "#16a34a" }} />
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="#16a34a"
                              textTransform="uppercase"
                              letterSpacing={0.5}
                            >
                              Strengths
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                            {session.strengths}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {session.improvements && (
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(217,119,6,0.06)",
                            border: "1px solid rgba(217,119,6,0.2)",
                          }}
                        >
                          <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75}>
                            <TrendingUp style={{ fontSize: 13, color: "#d97706" }} />
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="#d97706"
                              textTransform="uppercase"
                              letterSpacing={0.5}
                            >
                              Improve
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                            {session.improvements}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Box>

              {/* ── Gap Analysis ── */}
              {session.gapAnalysis && (
                <Box
                  sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(239,68,68,0.25)",
                    bgcolor: "rgba(239,68,68,0.03)",
                    p: 3,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                    <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "rgba(239,68,68,0.1)" }}>
                      <Target style={{ fontSize: 16, color: "#ef4444" }} />
                    </Box>
                    <Typography fontWeight={700}>Gap Analysis</Typography>
                    <Chip
                      label="Honest Assessment"
                      size="small"
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        height: 18,
                        bgcolor: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                        "& .MuiChip-label": { px: 0.75 },
                      }}
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    lineHeight={1.8}
                    whiteSpace="pre-line"
                  >
                    {session.gapAnalysis}
                  </Typography>
                </Box>
              )}

              {/* ── Action Plan ── */}
              {session.actionPlan && session.actionPlan.length > 0 && (
                <Box
                  sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(99,102,241,0.25)",
                    bgcolor: "rgba(99,102,241,0.03)",
                    p: 3,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "rgba(99,102,241,0.1)" }}>
                      <ListChecks style={{ fontSize: 16, color: "#4f46e5" }} />
                    </Box>
                    <Typography fontWeight={700}>Your Action Plan</Typography>
                    <Chip
                      label="To Close the Gap"
                      size="small"
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        height: 18,
                        bgcolor: "rgba(99,102,241,0.1)",
                        color: "#4f46e5",
                        "& .MuiChip-label": { px: 0.75 },
                      }}
                    />
                  </Stack>
                  <Stack spacing={1.25}>
                    {session.actionPlan.map((step, i) => (
                      <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            mt: 0.15,
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            color="white"
                            fontSize="0.6rem"
                          >
                            {i + 1}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                          {step}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* ── Q&A Breakdown ── */}
              <Box>
                <Typography fontWeight={700} mb={1.5}>
                  Question-by-Question Breakdown
                </Typography>
                <Stack spacing={1}>
                  {qaList.map((qa) => (
                    <Accordion
                      key={qa.index}
                      disableGutters
                      elevation={0}
                      sx={{
                        borderRadius: "12px !important",
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        "&:before": { display: "none" },
                        "& + &": { mt: 0 },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ChevronDown style={{ fontSize: 16 }} />}
                        sx={{
                          px: 2.5,
                          py: 0.5,
                          minHeight: 52,
                          "& .MuiAccordionSummary-content": {
                            alignItems: "center",
                            gap: 1.5,
                            my: 0,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            bgcolor: "rgba(99,102,241,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            color="primary"
                            fontSize="0.65rem"
                          >
                            {qa.index}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          flex={1}
                          noWrap
                          sx={{ maxWidth: { xs: 160, sm: 360, md: 480 } }}
                        >
                          {qa.question}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                          <CategoryChip category={qa.category} />
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Star style={{ fontSize: 12, color: "#f59e0b" }} />
                            <ScoreBadge score={qa.score} />
                          </Stack>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
                        <Stack spacing={2} ml={4.5}>
                          {qa.userAnswer && (
                            <Box>
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color="text.disabled"
                                textTransform="uppercase"
                                letterSpacing={0.5}
                                display="block"
                                mb={0.5}
                              >
                                Your Answer
                              </Typography>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  bgcolor: "action.hover",
                                  borderLeft: "3px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                                  {qa.userAnswer}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          {qa.feedback && (
                            <Box>
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color="text.disabled"
                                textTransform="uppercase"
                                letterSpacing={0.5}
                                display="block"
                                mb={0.5}
                              >
                                Feedback
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="flex-start">
                                <AlertTriangle
                                  style={{
                                    fontSize: 14,
                                    color: "#d97706",
                                    flexShrink: 0,
                                    marginTop: 2,
                                  }}
                                />
                                <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                                  {qa.feedback}
                                </Typography>
                              </Stack>
                            </Box>
                          )}
                          {qa.idealAnswer && (
                            <Box
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "rgba(99,102,241,0.05)",
                                border: "1px solid rgba(99,102,241,0.2)",
                              }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color="primary"
                                textTransform="uppercase"
                                letterSpacing={0.5}
                                display="block"
                                mb={0.5}
                              >
                                Ideal Answer
                              </Typography>
                              <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                                {qa.idealAnswer}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Box>
      </Box>
    );
  }

  return null;
}
