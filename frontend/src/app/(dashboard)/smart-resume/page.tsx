"use client";

import PaymentModal from "@/components/resume/PaymentModal";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AlertCircle, ChevronRight, Info, Loader2, RefreshCw } from "@/components/ui/icons";
import api from "@/lib/api";
import { formatDate, toCamelCase } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { GeneratedResume, Resume, ResumeAnalysis, ResumeData } from "@/types";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function SmartResumePage() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [generated, setGenerated] = useState<GeneratedResume | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const resumeRef = useRef<HTMLDivElement>(null);

  // ── Uploaded resumes ─────────────────────────────────────────────────────
  const { data: resumes, isLoading: resumesLoading } = useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const res = await api.get("/resumes", { params: { page: 0, size: 20 } });
      return Array.isArray(res.data) ? res.data : (res.data.content ?? []);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/resumes/upload", formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      api
        .get("/users/profile")
        .then((r) => setUser(r.data))
        .catch(() => {});
      toast.success("Resume uploaded successfully!");
    },
    onError: () => toast.error("Failed to upload resume. Please try a valid PDF file."),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/resumes/${id}/primary`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Resume deleted.");
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Smart resume (AI generation) ─────────────────────────────────────────
  const { data: latestResume } = useQuery<GeneratedResume>({
    queryKey: ["smart-resume-latest"],
    queryFn: async (): Promise<GeneratedResume> => {
      const res = await api.get("/smart-resume/latest");
      return res.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (latestResume) setGenerated(latestResume);
  }, [latestResume]);

  const analyzeMutation = useMutation({
    mutationFn: async (): Promise<ResumeAnalysis> => {
      const res = await api.post("/smart-resume/analyze");
      return res.data;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success(`ATS Score: ${data.atsScore}/100 — ${data.scoreLabel}`);
    },
    onError: () => toast.error("Analysis failed. Make sure you have a resume uploaded."),
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgressSteps(["Starting resume generation..."]);
    try {
      // Read directly from the auth store — api.defaults.headers is never
      // populated (the axios interceptor sets per-request headers, not defaults),
      // so api.defaults.headers.common["Authorization"] is always undefined.
      const token = useAuthStore.getState().accessToken;
      const apiBase = api.defaults.baseURL ?? "https://kaddy-autoapply.onrender.com/api";

      const response = await fetch(`${apiBase}/smart-resume/generate/stream`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "text/event-stream",
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const block of parts) {
          let eventType = "message";
          let eventData = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            if (line.startsWith("data: ")) eventData = line.slice(6).trim();
          }
          if (!eventData) continue;

          if (eventType === "pass") {
            const d = JSON.parse(eventData) as {
              pass: number;
              total: number;
              score: number;
              message: string;
            };
            setProgressSteps((prev) => [...prev, d.message]);
          } else if (eventType === "complete") {
            const d = JSON.parse(eventData) as GeneratedResume;
            setGenerated(d);
            toast.success("Resume generated successfully!");
          } else if (eventType === "error") {
            const d = JSON.parse(eventData) as { message: string };
            throw new Error(d.message);
          }
        }
      }
    } catch (err) {
      console.error("SSE generation failed:", err);
      toast.error("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePaySuccess = async () => {
    if (!generated) return;
    const res = await api.get(`/smart-resume/${generated.id}/full`);
    setGenerated(res.data);
  };

  const handleDownloadPDF = async () => {
    if (!resumeRef.current) {
      toast.error("Resume preview not ready.");
      return;
    }
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      // Clone the resume div and append it directly to <body> so that any
      // overflow-hidden ancestor cannot clip the captured content. html2canvas
      // uses the element's scrollHeight, which is correct only when no parent
      // clips it. The clone is removed in the finally block.
      const source = resumeRef.current;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;background:#fff;" +
        `width:${source.offsetWidth}px;z-index:-1;`;
      document.body.appendChild(clone);

      try {
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: clone.offsetWidth,
          height: clone.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const pdf = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        let yOffset = 0;
        while (yOffset < imgHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, -yOffset, imgWidth, imgHeight);
          yOffset += pageHeight;
        }

        // jsPDF 3+/4+ save() returns a Promise — must be awaited
        await pdf.save(`${generated?.resumeData?.name ?? "Resume"}.pdf`);
        toast.success("PDF downloaded!");
      } finally {
        document.body.removeChild(clone);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("PDF download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="space-y-1 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600">
            <AutoAwesomeRoundedIcon sx={{ fontSize: 20, color: "#fff" }} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#1d1d1f] dark:text-white">Smart Resume</h1>
        <p className="text-sm text-[#86868b] dark:text-[#8e8e93]">
          Upload your resume · get an ATS score · generate an AI-optimized version
        </p>
      </div>

      {/* ── Upgrade banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-px">
        <div className="flex flex-col items-center justify-between gap-4 rounded-[15px] bg-gradient-to-r from-indigo-950/90 via-violet-950/90 to-purple-950/90 px-6 py-5 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 26, color: "#c4b5fd" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Unlock the full optimized resume</p>
              <p className="mt-0.5 text-xs text-indigo-300">
                One-time ₹54 · ATS-tuned · PDF download · yours forever
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {["ATS-optimized", "PDF export", "AI rewrite"].map((f) => (
              <span
                key={f}
                className="hidden items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-200 sm:flex"
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 12 }} />
                {f}
              </span>
            ))}
            <Button
              size="sm"
              onClick={() => generated && setPayModal(true)}
              className="shrink-0 border-0 bg-white font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              <CreditCardRoundedIcon sx={{ fontSize: 16 }} />
              Upgrade — ₹54
            </Button>
          </div>
        </div>
      </div>

      {/* ── Resume Library ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <InsertDriveFileRoundedIcon sx={{ fontSize: 16, color: "#6366f1" }} />
              </div>
              <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                Resume Library
              </h2>
              {resumes && resumes.length > 0 && (
                <span className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-[10px] font-semibold text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#8e8e93]">
                  {resumes.length}
                </span>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
              />
              <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
                <CloudUploadRoundedIcon sx={{ fontSize: 16 }} />
                Upload PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {resumesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : resumes && resumes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-[#f9f9fb] p-4 transition-colors hover:border-indigo-300 dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:hover:border-indigo-700"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-600/10">
                    <InsertDriveFileRoundedIcon sx={{ fontSize: 20, color: "#6366f1" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[#1d1d1f] dark:text-white">
                        {resume.filename}
                      </p>
                      {resume.isPrimary && (
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                          <StarRoundedIcon sx={{ fontSize: 11 }} />
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#86868b] dark:text-[#8e8e93]">
                      {formatDate(resume.createdAt)}
                      {resume.fileSize && ` · ${(resume.fileSize / 1024).toFixed(0)} KB`}
                    </p>
                    {resume.parsedData?.skills &&
                      (() => {
                        const allSkills = Object.values(resume.parsedData.skills!)
                          .flat()
                          .filter(Boolean) as string[];
                        return allSkills.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {allSkills.slice(0, 5).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-[10px] font-medium text-[#6e6e73] dark:bg-[#2c2c2e] dark:text-[#8e8e93]"
                              >
                                {toCamelCase(skill)}
                              </span>
                            ))}
                            {allSkills.length > 5 && (
                              <span className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-[10px] font-medium text-[#86868b] dark:bg-[#2c2c2e] dark:text-[#636366]">
                                +{allSkills.length - 5}
                              </span>
                            )}
                          </div>
                        ) : null;
                      })()}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {!resume.isPrimary && (
                      <button
                        onClick={() => setPrimaryMutation.mutate(resume.id)}
                        title="Set as primary"
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      >
                        <StarRoundedIcon sx={{ fontSize: 16, color: "#f59e0b" }} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(resume.id)}
                      title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <DeleteRoundedIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-600/10">
                <CloudUploadRoundedIcon sx={{ fontSize: 28, color: "#6366f1" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  No resumes yet
                </p>
                <p className="mt-1 max-w-xs text-xs text-[#86868b] dark:text-[#8e8e93]">
                  Upload a PDF resume to enable ATS analysis and AI‑powered optimization
                </p>
              </div>
              <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
                <CloudUploadRoundedIcon sx={{ fontSize: 16 }} />
                Upload PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step cards row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Step 1 — ATS Analysis */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <AnalyticsRoundedIcon sx={{ fontSize: 18, color: "#3b82f6" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    STEP 1
                  </span>
                </div>
                <h2 className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  ATS Analysis
                </h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => analyzeMutation.mutate()}
                loading={analyzeMutation.isPending}
              >
                {analysis ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
                  </>
                ) : (
                  <>
                    <AnalyticsRoundedIcon sx={{ fontSize: 15 }} /> Analyze
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {analyzeMutation.isPending && (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                <p className="text-center text-xs text-[#86868b] dark:text-[#8e8e93]">
                  Scanning for ATS compatibility…
                </p>
              </div>
            )}

            {analysis && !analyzeMutation.isPending && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <AnimatedGauge score={analysis.atsScore} />
                  <div>
                    <p className="text-base font-bold text-[#1d1d1f] dark:text-white">
                      {analysis.scoreLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-[#86868b] dark:text-[#8e8e93]">
                      {analysis.wordCount} words · {analysis.lengthAssessment}
                    </p>
                  </div>
                </div>

                {analysis.strengths.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wider text-green-600 uppercase dark:text-green-400">
                      <CheckCircleRoundedIcon sx={{ fontSize: 13 }} /> Strengths
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.strengths.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.missingFields.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wider text-red-500 uppercase dark:text-red-400">
                      <AlertCircle className="h-3 w-3" /> Missing
                    </p>
                    <ul className="space-y-1">
                      {analysis.missingFields.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.suggestions.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                      <Info className="h-3 w-3" /> Suggestions
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.suggestions.map((s) => (
                        <li
                          key={s}
                          className="flex items-start gap-2 text-xs text-[#3c3c43] dark:text-[#c9d1d9]"
                        >
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!analysis && !analyzeMutation.isPending && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AnalyticsRoundedIcon sx={{ fontSize: 36, color: "#c7d2fe" }} />
                <p className="max-w-[200px] text-xs text-[#86868b] dark:text-[#8e8e93]">
                  Scan your primary resume for ATS compatibility issues
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2 — Generate */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                <AutoFixHighRoundedIcon sx={{ fontSize: 18, color: "#7c3aed" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                    STEP 2
                  </span>
                </div>
                <h2 className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  Generate Optimized
                </h2>
              </div>
              <Button size="sm" onClick={handleGenerate} loading={isGenerating}>
                <AutoFixHighRoundedIcon sx={{ fontSize: 15 }} />
                {generated ? "Regenerate" : "Generate"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {isGenerating && (
              <div className="flex flex-col gap-3 py-5">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />
                  <p className="text-xs font-medium text-[#1d1d1f] dark:text-white">
                    Optimizing with AI…
                  </p>
                </div>
                <div className="space-y-1.5 pl-1">
                  {progressSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      <p className="text-[11px] text-[#3c3c43] dark:text-[#aeaeb2]">{step}</p>
                    </div>
                  ))}
                  {progressSteps.length > 0 && (
                    <div className="flex items-center gap-2 opacity-50">
                      <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-violet-300" />
                      <p className="text-[11px] text-[#86868b] dark:text-[#636366]">Working…</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {generated && !isGenerating && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
                    <AnalyticsRoundedIcon sx={{ fontSize: 13 }} />
                    ATS {generated.atsScore}/100
                  </span>
                  {generated.paid ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      <CheckCircleRoundedIcon sx={{ fontSize: 13 }} />
                      Unlocked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                      <LockRoundedIcon sx={{ fontSize: 13 }} />
                      Preview Only
                    </span>
                  )}
                  {generated.paid && (
                    <Button
                      size="sm"
                      onClick={handleDownloadPDF}
                      loading={downloading}
                      className="ml-auto"
                    >
                      <DownloadRoundedIcon sx={{ fontSize: 16 }} />
                      Download PDF
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-[#86868b] dark:text-[#8e8e93]">
                  Preview below — unlock to get the full version
                </p>
              </div>
            )}

            {!generated && !isGenerating && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AutoFixHighRoundedIcon sx={{ fontSize: 36, color: "#ddd6fe" }} />
                <p className="max-w-[200px] text-xs text-[#86868b] dark:text-[#8e8e93]">
                  Create an AI-optimized version with all ATS issues resolved
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Resume preview (full width below step cards) ─────────────────── */}
      {generated && !isGenerating && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <InsertDriveFileRoundedIcon sx={{ fontSize: 16, color: "#6366f1" }} />
              </div>
              <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                Resume Preview
              </h2>
              {generated.paid && (
                <Button
                  size="sm"
                  onClick={handleDownloadPDF}
                  loading={downloading}
                  className="ml-auto"
                >
                  <DownloadRoundedIcon sx={{ fontSize: 16 }} />
                  Download PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
              <div className="bg-white p-8" ref={resumeRef} id="resume-preview">
                <ResumePreview
                  data={generated.paid ? generated.resumeData : generated.previewData}
                  full={generated.paid}
                />
              </div>

              {!generated.paid && (
                <div className="relative">
                  <div className="pointer-events-none bg-white p-8 opacity-40 blur-sm select-none">
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-3/4 rounded bg-gray-200" />
                          <div className="h-3 w-full rounded bg-gray-100" />
                          <div className="h-3 w-5/6 rounded bg-gray-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] dark:bg-black/50">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40">
                      <LockRoundedIcon sx={{ fontSize: 28, color: "#6366f1" }} />
                    </div>
                    <p className="mb-1 text-sm font-bold text-[#1d1d1f] dark:text-white">
                      Full resume locked
                    </p>
                    <p className="mb-4 max-w-xs text-center text-xs text-[#86868b] dark:text-[#8e8e93]">
                      Pay a one-time ₹54 to unlock, download, and keep your AI-optimized resume
                      forever.
                    </p>
                    <Button onClick={() => setPayModal(true)}>
                      <CreditCardRoundedIcon sx={{ fontSize: 17 }} />
                      Unlock — ₹54
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {generated && (
        <PaymentModal
          open={payModal}
          resumeId={generated.id}
          onClose={() => setPayModal(false)}
          onSuccess={handlePaySuccess}
        />
      )}
    </div>
  );
}

// ── Animated gauge ────────────────────────────────────────────────────────────

function AnimatedGauge({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const duration = 1000;

  useEffect(() => {
    startRef.current = null;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const strokeColor = score >= 70 ? "#4F46E5" : score >= 50 ? "#F59E0B" : "#EF4444";
  const labelColor =
    score >= 70 ? "text-indigo-600" : score >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={`${displayed} ${100 - displayed}`}
          strokeLinecap="round"
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${labelColor}`}>{displayed}</span>
        <span className="text-[9px] font-medium text-gray-400">/100</span>
      </div>
    </div>
  );
}

// ── Resume preview ────────────────────────────────────────────────────────────

function ResumePreview({
  data,
  full,
}: {
  data: Partial<ReturnType<typeof Object.assign>> | null;
  full: boolean;
}) {
  if (!data) return <p className="text-sm text-gray-400">No data available.</p>;

  const d = data as ResumeData;

  return (
    <div className="mx-auto max-w-2xl space-y-5 font-serif text-sm text-gray-800 print:text-xs">
      <div className="border-b border-gray-300 pb-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{d.name}</h1>
        {d.contact && (
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
            {[
              d.contact.email,
              d.contact.phone,
              d.contact.location,
              d.contact.linkedin &&
                `linkedin.com/in/${d.contact.linkedin
                  .replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, "")
                  .replace(/\/$/, "")}`,
              d.contact.github &&
                `github.com/${d.contact.github
                  .replace(/^https?:\/\/(www\.)?github\.com\//, "")
                  .replace(/\/$/, "")}`,
            ]
              .filter(Boolean)
              .map((item, i, arr) => (
                <span key={i} className="whitespace-nowrap">
                  {item}
                  {i < arr.length - 1 && <span className="ml-3 text-gray-300">·</span>}
                </span>
              ))}
          </div>
        )}
      </div>

      {d.summary && (
        <Section title="Professional Summary">
          <p className="leading-relaxed text-gray-700">{d.summary}</p>
        </Section>
      )}

      {d.experience && d.experience.length > 0 && (
        <Section title="Experience">
          {d.experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-gray-900">{exp.title}</p>
                <p className="text-xs text-gray-500">
                  {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                </p>
              </div>
              <p className="mb-1 text-xs text-gray-600">
                {exp.company}
                {exp.location ? ` · ${exp.location}` : ""}
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {exp.bullets?.map((b, j) => (
                  <li key={j} className="text-gray-700">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {d.skills && (
        <Section title="Skills">
          <div className="space-y-1">
            {(
              [
                ["Technical", d.skills.technical],
                ["Frameworks", d.skills.frameworks],
                ["Databases", d.skills.databases],
                ["Cloud", d.skills.cloud],
                ["Tools", d.skills.tools],
                ["Languages", d.skills.languages],
                ["Soft Skills", d.skills.soft],
              ] as [string, string[] | undefined][]
            )
              .filter(([, v]) => v && v.length > 0)
              .map(([label, v]) => (
                <p key={label}>
                  <span className="font-medium">{label}:</span> {v!.join(", ")}
                </p>
              ))}
          </div>
        </Section>
      )}

      {full && (
        <>
          {d.education && d.education.length > 0 && (
            <Section title="Education">
              {d.education.map((edu, i) => (
                <div key={i} className="mb-2">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold">
                      {edu.degree} in {edu.field}
                    </p>
                    <p className="text-xs text-gray-500">{edu.graduationDate}</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {edu.institution}
                    {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                  </p>
                </div>
              ))}
            </Section>
          )}

          {d.projects && d.projects.length > 0 && (
            <Section title="Projects">
              {d.projects.map((p, i) => (
                <div key={i} className="mb-2">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-gray-700">{p.description}</p>
                  {p.technologies?.length > 0 && (
                    <p className="text-xs text-gray-500">{p.technologies.join(", ")}</p>
                  )}
                </div>
              ))}
            </Section>
          )}

          {d.certifications && d.certifications.length > 0 && (
            <Section title="Certifications">
              {d.certifications.map((c, i) => (
                <p key={i} className="text-gray-700">
                  {c.name} — {c.issuer}
                  {c.date ? ` (${c.date})` : ""}
                </p>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
        {title}
      </h2>
      {children}
    </div>
  );
}
