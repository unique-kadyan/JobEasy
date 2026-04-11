"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { MockInterviewSession, MockInterviewQA } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { getTierFeatures } from "@/lib/tier-features";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Play,
  CheckCircle,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Lock,
  Trophy,
  ArrowLeft,
  Send,
} from "lucide-react";

type Phase = "list" | "setup" | "interview" | "results";

const DIFFICULTY_OPTS = [
  { value: "ENTRY", label: "Entry Level", desc: "0–2 years experience" },
  { value: "MID", label: "Mid Level", desc: "2–5 years experience" },
  { value: "SENIOR", label: "Senior", desc: "5–8 years experience" },
  { value: "LEAD", label: "Lead / Staff", desc: "8+ years experience" },
];

const CATEGORY_COLORS: Record<string, string> = {
  BEHAVIORAL: "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  TECHNICAL: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  SITUATIONAL: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  CULTURE_FIT: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
};

function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? "text-green-600 dark:text-green-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-500";
  return <span className={cn("text-sm font-bold tabular-nums", color)}>{score}/{max}</span>;
}

export default function InterviewPrepPage() {
  const { user } = useAuthStore();
  const tier = user?.subscriptionTier ?? "FREE";
  const caps = getTierFeatures(tier);

  const [phase, setPhase] = useState<Phase>("list");
  const [session, setSession] = useState<MockInterviewSession | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [expandedQA, setExpandedQA] = useState<Set<number>>(new Set());

  // Setup form
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [difficulty, setDifficulty] = useState("MID");

  const { data: sessions, refetch: refetchList } = useQuery<{ content: MockInterviewSession[] }>({
    queryKey: ["interview-sessions"],
    queryFn: () => api.get("/interview-prep/sessions?size=10").then((r) => r.data),
    enabled: phase === "list",
  });

  const startMutation = useMutation({
    mutationFn: () =>
      api.post("/interview-prep/sessions", {
        jobTitle, company, jobDescription: jobDesc, difficultyLevel: difficulty,
      }).then((r) => r.data as MockInterviewSession),
    onSuccess: (s) => {
      setSession(s);
      setAnswers({});
      setPhase("interview");
    },
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post(`/interview-prep/sessions/${session!.id}/submit`, {
        answers: Object.entries(answers).map(([idx, answer]) => ({
          index: Number(idx), answer,
        })),
      }).then((r) => r.data as MockInterviewSession),
    onSuccess: (s) => {
      setSession(s);
      setPhase("results");
      refetchList();
    },
  });

  if (!caps.mockInterview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
          <Lock className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">Interview Prep is a Gold Feature</h2>
        <p className="text-sm text-[#86868b] dark:text-[#8e8e93] max-w-sm">
          Practice with AI-powered mock interviews tailored to real job roles. Upgrade to Gold or Platinum to unlock.
        </p>
        <Button onClick={() => (window.location.href = "/pricing")}>Upgrade Now</Button>
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  if (phase === "list") {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Interview Prep</h1>
            <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">
              Practice with AI-generated questions tailored to your target role
            </p>
          </div>
          <Button onClick={() => setPhase("setup")}>
            <Play className="h-4 w-4" /> New Session
          </Button>
        </div>

        {sessions?.content?.length === 0 || !sessions?.content ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <MessageSquare className="h-10 w-10 text-[#86868b]" />
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">No sessions yet</p>
              <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">Start your first mock interview to practice and get AI feedback</p>
              <Button size="sm" onClick={() => setPhase("setup")}>Start Practicing</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.content.map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                onClick={() => { setSession(s); setPhase("results"); }}
              >
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{s.jobTitle}</p>
                    <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                      {s.company && `${s.company} · `}{s.difficultyLevel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.status === "COMPLETED" ? (
                      <>
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Completed
                        </span>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-sm font-bold text-[#1d1d1f] dark:text-white">{s.overallScore}</span>
                          <span className="text-xs text-[#86868b]">/100</span>
                        </div>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="h-3.5 w-3.5" /> In Progress
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase("list")}
            className="text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Set Up Session</h1>
            <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">Tell us about the role you&apos;re interviewing for</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <Input
              label="Job Title *"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              required
            />
            <Input
              label="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Google"
            />
            <div>
              <label className="block text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-1.5">
                Job Description (optional — helps tailor questions)
              </label>
              <textarea
                className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white px-3 py-2 text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                rows={4}
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder="Paste the job description here..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTY_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={cn(
                      "text-left px-3 py-2.5 rounded-xl border text-xs transition-colors",
                      difficulty === opt.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                        : "border-black/10 dark:border-white/10 text-[#86868b] dark:text-[#8e8e93] hover:border-black/20 dark:hover:border-white/20"
                    )}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="opacity-70 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              loading={startMutation.isPending}
              disabled={!jobTitle.trim()}
              onClick={() => startMutation.mutate()}
            >
              <Play className="h-4 w-4" />
              {startMutation.isPending ? "Generating Questions…" : "Start Interview"}
            </Button>

            {startMutation.isError && (
              <p className="text-xs text-red-500">
                {(startMutation.error as any)?.message ?? "Failed to start session. Please try again."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Interview ─────────────────────────────────────────────────────────────
  if (phase === "interview" && session) {
    const qaList = session.questionsAndAnswers ?? [];
    const answered = qaList.filter((q) => (answers[q.index] ?? "").trim().length > 0).length;

    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">{session.jobTitle}</h1>
            <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
              {session.company && `${session.company} · `}{session.difficultyLevel} · {answered}/{qaList.length} answered
            </p>
          </div>
          <Button
            size="sm"
            loading={submitMutation.isPending}
            disabled={answered === 0}
            onClick={() => submitMutation.mutate()}
          >
            <Send className="h-3.5 w-3.5" />
            {submitMutation.isPending ? "Evaluating…" : "Submit & Get Feedback"}
          </Button>
        </div>

        <div className="space-y-3">
          {qaList.map((qa) => (
            <Card key={qa.index}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {qa.index}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                        CATEGORY_COLORS[qa.category] ?? "bg-[#f2f2f7] text-[#86868b] border-black/10"
                      )}>
                        {qa.category.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{qa.question}</p>
                    <textarea
                      className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white px-3 py-2 text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-colors"
                      rows={3}
                      placeholder="Type your answer here…"
                      value={answers[qa.index] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [qa.index]: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {submitMutation.isError && (
          <p className="text-sm text-red-500">
            {(submitMutation.error as any)?.message ?? "Submission failed. Please try again."}
          </p>
        )}
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (phase === "results" && session) {
    const qaList = session.questionsAndAnswers ?? [];

    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase("list")}
            className="text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">{session.jobTitle}</h1>
            <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
              {session.company && `${session.company} · `}{session.difficultyLevel}
            </p>
          </div>
        </div>

        {session.status === "COMPLETED" && (
          <>
            {/* Overall score card */}
            <Card>
              <CardContent className="py-5 px-5">
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-center justify-center h-20 w-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    <Trophy className="h-5 w-5 text-amber-500 mb-1" />
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{session.overallScore}</span>
                    <span className="text-[10px] text-[#86868b]">/ 100</span>
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    {session.overallFeedback && (
                      <p className="text-sm text-[#1d1d1f] dark:text-white leading-relaxed">{session.overallFeedback}</p>
                    )}
                  </div>
                </div>

                {(session.strengths || session.improvements) && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {session.strengths && (
                      <div className="rounded-xl p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Strengths</p>
                        <p className="text-xs text-green-700 dark:text-green-300">{session.strengths}</p>
                      </div>
                    )}
                    {session.improvements && (
                      <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Improve</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">{session.improvements}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Q&A breakdown */}
            <div className="space-y-3">
              {qaList.map((qa) => {
                const expanded = expandedQA.has(qa.index);
                return (
                  <Card key={qa.index}>
                    <CardContent className="pt-4 pb-3 px-5">
                      <button
                        className="flex w-full items-start gap-3 text-left"
                        onClick={() => setExpandedQA((prev) => {
                          const next = new Set(prev);
                          expanded ? next.delete(qa.index) : next.add(qa.index);
                          return next;
                        })}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {qa.index}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{qa.question}</p>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                              CATEGORY_COLORS[qa.category] ?? ""
                            )}>
                              {qa.category.replace("_", " ")}
                            </span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-400" />
                              <ScoreBadge score={qa.score} />
                            </div>
                          </div>
                        </div>
                        {expanded
                          ? <ChevronUp className="h-4 w-4 text-[#86868b] shrink-0 mt-1" />
                          : <ChevronDown className="h-4 w-4 text-[#86868b] shrink-0 mt-1" />}
                      </button>

                      {expanded && (
                        <div className="mt-3 ml-9 space-y-3">
                          {qa.userAnswer && (
                            <div>
                              <p className="text-[10px] font-semibold text-[#86868b] dark:text-[#8e8e93] uppercase tracking-wider mb-1">Your Answer</p>
                              <p className="text-sm text-[#1d1d1f] dark:text-white bg-[#f5f5f7] dark:bg-white/[0.04] rounded-xl p-3">{qa.userAnswer}</p>
                            </div>
                          )}
                          {qa.feedback && (
                            <div>
                              <p className="text-[10px] font-semibold text-[#86868b] dark:text-[#8e8e93] uppercase tracking-wider mb-1">Feedback</p>
                              <p className="text-sm text-[#1d1d1f] dark:text-white">{qa.feedback}</p>
                            </div>
                          )}
                          {qa.idealAnswer && (
                            <div className="rounded-xl p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                              <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Ideal Answer</p>
                              <p className="text-sm text-indigo-700 dark:text-indigo-300">{qa.idealAnswer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button className="w-full" variant="outline" onClick={() => setPhase("setup")}>
              <Play className="h-4 w-4" /> Practice Again
            </Button>
          </>
        )}

        {session.status === "IN_PROGRESS" && (
          <Card>
            <CardContent className="py-6 text-center space-y-3">
              <Clock className="h-8 w-8 text-amber-500 mx-auto" />
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">Session In Progress</p>
              <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">This session was started but not submitted.</p>
              <Button size="sm" onClick={() => { setAnswers({}); setPhase("interview"); }}>
                Continue Session
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
