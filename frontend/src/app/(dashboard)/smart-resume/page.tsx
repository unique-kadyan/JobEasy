"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PaymentModal from "@/components/resume/PaymentModal";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Lock,
  Download,
  RefreshCw,
  ChevronRight,
} from "@/components/ui/icons";
import type { ResumeAnalysis, GeneratedResume, ResumeData } from "@/types";

export default function SmartResumePage() {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [generated, setGenerated] = useState<GeneratedResume | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!resumeRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(resumeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
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

      pdf.save(`${generated?.resumeData?.name ?? "resume"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

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
    onError: () =>
      toast.error("Analysis failed. Make sure you have a resume uploaded."),
  });

  const generateMutation = useMutation({
    mutationFn: async (): Promise<GeneratedResume> => {
      const res = await api.post("/smart-resume/generate");
      return res.data;
    },
    onSuccess: (data) => {
      setGenerated(data);
      toast.success("Resume generated successfully!");
    },
    onError: () => toast.error("Generation failed. Please try again."),
  });

  const handlePaySuccess = async () => {
    if (!generated) return;
    const res = await api.get(`/smart-resume/${generated.id}/full`);
    setGenerated(res.data);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          Smart Resume
        </h1>
        <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">
          AI-powered ATS analysis and professionally optimized resume generation
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Step 1 — ATS Analysis
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => analyzeMutation.mutate()}
              loading={analyzeMutation.isPending}
            >
              {analysis ? (
                <>
                  <RefreshCw className="h-4 w-4" /> Re-analyze
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Analyze Resume
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analyzeMutation.isPending && (
            <div className="flex items-center gap-3 py-4 text-[#86868b] dark:text-[#8e8e93]">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              Scanning your resume for ATS compatibility…
            </div>
          )}

          {analysis && (
            <div className="space-y-5">
              <div className="flex items-center gap-5">
                <AnimatedGauge score={analysis.atsScore} />
                <div>
                  <p className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                    {analysis.scoreLabel}
                  </p>
                  <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                    {analysis.wordCount} words · {analysis.lengthAssessment}
                  </p>
                </div>
              </div>

              {analysis.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white mb-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Strengths
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.strengths.map((s) => (
                      <Badge
                        key={s}
                        className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.missingFields.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white mb-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" /> Missing
                    Sections
                  </p>
                  <ul className="space-y-1">
                    {analysis.missingFields.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white mb-2 flex items-center gap-1">
                    <Info className="h-4 w-4 text-amber-500" /> Suggestions
                  </p>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((s) => (
                      <li
                        key={s}
                        className="flex items-start gap-2 text-sm text-[#3c3c43] dark:text-[#c9d1d9]"
                      >
                        <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!analysis && !analyzeMutation.isPending && (
            <p className="text-sm text-[#86868b] dark:text-[#8e8e93] py-2">
              Click &ldquo;Analyze Resume&rdquo; to scan your primary resume for
              ATS compatibility issues.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Step 2 — Generate Optimized Resume
            </h2>
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              {generated ? "Regenerate" : "Fix & Generate"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {generateMutation.isPending && (
            <div className="flex items-center gap-3 py-4 text-[#86868b] dark:text-[#8e8e93]">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span>
                Generating your optimized resume using AI…
                <span className="text-xs block text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  This may take 15–30 seconds
                </span>
              </span>
            </div>
          )}

          {generated && !generateMutation.isPending && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                    ATS Score: {generated.atsScore}
                  </Badge>
                  {generated.paid ? (
                    <Badge className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" /> Unlocked
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                      <Lock className="h-3 w-3 mr-1" /> Preview Only
                    </Badge>
                  )}
                </div>
                {generated.paid && (
                  <Button
                    size="sm"
                    onClick={handleDownloadPDF}
                    loading={downloading}
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                )}
              </div>

              <div className="relative rounded-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
                <div
                  className="p-8 bg-white"
                  ref={resumeRef}
                  id="resume-preview"
                >
                  <ResumePreview
                    data={
                      generated.paid
                        ? generated.resumeData
                        : generated.previewData
                    }
                    full={generated.paid}
                  />
                </div>

                {!generated.paid && (
                  <div className="relative">
                    <div className="p-8 bg-white blur-sm select-none pointer-events-none opacity-50">
                      <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-full" />
                            <div className="h-3 bg-gray-100 rounded w-5/6" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
                      <Lock className="h-8 w-8 text-indigo-500 mb-3" />
                      <p className="font-semibold text-[#1d1d1f] mb-1 text-sm">
                        Full resume locked
                      </p>
                      <p className="text-sm text-[#86868b] mb-4 text-center max-w-xs">
                        Pay a one-time fee to unlock, download, and keep your
                        optimized resume.
                      </p>
                      <Button onClick={() => setPayModal(true)}>
                        <CreditCardIcon />
                        Unlock — ₹54
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!generated && !generateMutation.isPending && (
            <p className="text-sm text-[#86868b] dark:text-[#8e8e93] py-2">
              Click &ldquo;Fix &amp; Generate&rdquo; to create an AI-optimized
              version of your resume with all ATS issues fixed.
            </p>
          )}
        </CardContent>
      </Card>

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

  const strokeColor =
    score >= 70 ? "#4F46E5" : score >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="3"
        />
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
        <span className="text-xl font-bold text-gray-900">{displayed}</span>
        <span className="text-xs text-gray-500">/100</span>
      </div>
    </div>
  );
}

function CreditCardIcon() {
  return (
    <svg
      className="h-4 w-4 mr-1"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeWidth="2" />
      <line x1="1" y1="10" x2="23" y2="10" strokeWidth="2" />
    </svg>
  );
}

function ResumePreview({
  data,
  full,
}: {
  data: Partial<ReturnType<typeof Object.assign>> | null;
  full: boolean;
}) {
  if (!data) return <p className="text-gray-400 text-sm">No data available.</p>;

  const d = data as ResumeData;

  return (
    <div className="font-serif text-sm text-gray-800 space-y-5 max-w-2xl mx-auto print:text-xs">
      <div className="text-center border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{d.name}</h1>
        {d.contact && (
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
            {[
              d.contact.email,
              d.contact.phone,
              d.contact.location,
              d.contact.linkedin &&
                `linkedin.com/in/${d.contact.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, "").replace(/\/$/, "")}`,
              d.contact.github &&
                `github.com/${d.contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "")}`,
            ]
              .filter(Boolean)
              .map((item, i, arr) => (
                <span key={i} className="whitespace-nowrap">
                  {item}
                  {i < arr.length - 1 && (
                    <span className="ml-3 text-gray-300">·</span>
                  )}
                </span>
              ))}
          </div>
        )}
      </div>

      {d.summary && (
        <Section title="Professional Summary">
          <p className="text-gray-700 leading-relaxed">{d.summary}</p>
        </Section>
      )}

      {d.experience && d.experience.length > 0 && (
        <Section title="Experience">
          {d.experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between items-baseline">
                <p className="font-semibold text-gray-900">{exp.title}</p>
                <p className="text-xs text-gray-500">
                  {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                </p>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                {exp.company}
                {exp.location ? ` · ${exp.location}` : ""}
              </p>
              <ul className="list-disc list-inside space-y-0.5">
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
                  <span className="font-medium">{label}:</span>{" "}
                  {v!.join(", ")}
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
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold">
                      {edu.degree} in {edu.field}
                    </p>
                    <p className="text-xs text-gray-500">
                      {edu.graduationDate}
                    </p>
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
                    <p className="text-xs text-gray-500">
                      {p.technologies.join(", ")}
                    </p>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
