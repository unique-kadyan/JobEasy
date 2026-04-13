"use client";

import Link from "next/link";
import { ExternalLink } from "@/components/ui/icons";
import PageTransition from "@/components/ui/PageTransition";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import DesignServicesRoundedIcon from "@mui/icons-material/DesignServicesRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";

// ─── Assessment tracks ────────────────────────────────────────────────────────

const TRACKS = [
  {
    id: "dsa",
    label: "Data Structures & Algorithms",
    icon: CodeRoundedIcon,
    color: "indigo",
    desc: "Master arrays, trees, graphs, dynamic programming, and system design interviews.",
    difficulty: "Beginner → Expert",
    platforms: [
      { name: "LeetCode", url: "https://leetcode.com/problemset/", badge: "Free" },
      { name: "NeetCode 150", url: "https://neetcode.io/practice", badge: "Free" },
      { name: "HackerRank DSA", url: "https://www.hackerrank.com/domains/data-structures", badge: "Free" },
    ],
  },
  {
    id: "frontend",
    label: "Frontend Development",
    icon: DesignServicesRoundedIcon,
    color: "violet",
    desc: "HTML, CSS, JavaScript, React, TypeScript — from fundamentals to advanced patterns.",
    difficulty: "Beginner → Advanced",
    platforms: [
      { name: "Frontend Mentor", url: "https://www.frontendmentor.io/challenges", badge: "Free" },
      { name: "JS30 — 30 JS Projects", url: "https://javascript30.com/", badge: "Free" },
      { name: "GreatFrontEnd", url: "https://www.greatfrontend.com/", badge: "Free + Paid" },
    ],
  },
  {
    id: "backend",
    label: "Backend & APIs",
    icon: StorageRoundedIcon,
    color: "emerald",
    desc: "REST, GraphQL, databases, system design, and backend performance patterns.",
    difficulty: "Intermediate → Expert",
    platforms: [
      { name: "roadmap.sh/backend", url: "https://roadmap.sh/backend", badge: "Free" },
      { name: "Exercism", url: "https://exercism.org/", badge: "Free" },
      { name: "BackendBro Challenges", url: "https://www.backend.expert/", badge: "Free" },
    ],
  },
  {
    id: "data",
    label: "Data Science & ML",
    icon: DataObjectRoundedIcon,
    color: "amber",
    desc: "Python, pandas, sklearn, deep learning, and real-world ML project challenges.",
    difficulty: "Beginner → Advanced",
    platforms: [
      { name: "Kaggle Learn", url: "https://www.kaggle.com/learn", badge: "Free" },
      { name: "Fast.ai", url: "https://www.fast.ai/", badge: "Free" },
      { name: "Kaggle Competitions", url: "https://www.kaggle.com/competitions", badge: "Free" },
    ],
  },
  {
    id: "cloud",
    label: "Cloud & DevOps",
    icon: CloudRoundedIcon,
    color: "sky",
    desc: "AWS, Azure, GCP, Docker, Kubernetes, CI/CD pipelines, and infrastructure as code.",
    difficulty: "Intermediate → Expert",
    platforms: [
      { name: "AWS Skill Builder", url: "https://skillbuilder.aws/", badge: "Free Tier" },
      { name: "KodeKloud", url: "https://kodekloud.com/", badge: "Free + Paid" },
      { name: "Play with Docker", url: "https://labs.play-with-docker.com/", badge: "Free" },
    ],
  },
  {
    id: "ai",
    label: "AI & Prompt Engineering",
    icon: AutoAwesomeRoundedIcon,
    color: "purple",
    desc: "LLMs, RAG, prompt design, embeddings, and building production AI applications.",
    difficulty: "Intermediate → Advanced",
    platforms: [
      { name: "DeepLearning.AI Short Courses", url: "https://www.deeplearning.ai/short-courses/", badge: "Free" },
      { name: "Hugging Face NLP Course", url: "https://huggingface.co/learn/nlp-course", badge: "Free" },
      { name: "Anthropic Prompt Library", url: "https://docs.anthropic.com/en/prompt-library/library", badge: "Free" },
    ],
  },
  {
    id: "cyber",
    label: "Cybersecurity",
    icon: SecurityRoundedIcon,
    color: "red",
    desc: "Ethical hacking, OWASP top 10, network security, CTF challenges, and certifications.",
    difficulty: "Beginner → Expert",
    platforms: [
      { name: "TryHackMe", url: "https://tryhackme.com/", badge: "Free + Paid" },
      { name: "HackTheBox", url: "https://www.hackthebox.com/", badge: "Free + Paid" },
      { name: "OWASP WebGoat", url: "https://owasp.org/www-project-webgoat/", badge: "Free" },
    ],
  },
  {
    id: "soft",
    label: "Communication & Leadership",
    icon: PsychologyRoundedIcon,
    color: "rose",
    desc: "Behavioral interviews, public speaking, negotiation, and leadership frameworks.",
    difficulty: "All levels",
    platforms: [
      { name: "Big Interview", url: "https://biginterview.com/", badge: "Paid" },
      { name: "Toastmasters Pathways", url: "https://www.toastmasters.org/pathways-overview", badge: "Membership" },
      { name: "Coursera — People Skills", url: "https://www.coursera.org/courses?query=communication+leadership", badge: "Audit Free" },
    ],
  },
];

const CERTIFICATIONS = [
  { name: "AWS Solutions Architect", issuer: "Amazon", url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/", color: "amber" },
  { name: "Google Cloud Professional", issuer: "Google", url: "https://cloud.google.com/certification", color: "sky" },
  { name: "CKA — Kubernetes", issuer: "CNCF", url: "https://www.cncf.io/certification/cka/", color: "indigo" },
  { name: "Meta Frontend Developer", issuer: "Meta / Coursera", url: "https://www.coursera.org/professional-certificates/meta-front-end-developer", color: "violet" },
  { name: "TensorFlow Developer", issuer: "Google / TensorFlow", url: "https://www.tensorflow.org/certificate", color: "amber" },
  { name: "CompTIA Security+", issuer: "CompTIA", url: "https://www.comptia.org/certifications/security", color: "red" },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", icon: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800/50", badge: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300" },
  violet: { bg: "bg-violet-50 dark:bg-violet-500/10", icon: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800/50", badge: "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/50", badge: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800/50", badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  sky: { bg: "bg-sky-50 dark:bg-sky-500/10", icon: "text-sky-600 dark:text-sky-400", border: "border-sky-200 dark:border-sky-800/50", badge: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300" },
  purple: { bg: "bg-purple-50 dark:bg-purple-500/10", icon: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800/50", badge: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300" },
  red: { bg: "bg-red-50 dark:bg-red-500/10", icon: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800/50", badge: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" },
  rose: { bg: "bg-rose-50 dark:bg-rose-500/10", icon: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800/50", badge: "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300" },
};

export default function SkillHubPage() {
  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600">
              <SchoolRoundedIcon sx={{ fontSize: 22, color: "#fff" }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] dark:text-white">Skill Hub</h1>
          <p className="text-sm text-[#1d1d1f] dark:text-white opacity-60 max-w-lg mx-auto">
            Curated practice tracks, assessments, and certifications — everything you need to level up before your next interview.
          </p>
        </div>

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: CodeRoundedIcon, label: "Practice Tracks", value: "8", color: "indigo" },
            { icon: WorkspacePremiumRoundedIcon, label: "Top Certifications", value: "6", color: "amber" },
            { icon: LeaderboardRoundedIcon, label: "Platforms Curated", value: "24+", color: "emerald" },
          ].map((s) => {
            const c = COLOR_MAP[s.color];
            return (
              <div key={s.label} className={`rounded-2xl border ${c.border} ${c.bg} p-4 flex flex-col items-center gap-1 text-center`}>
                <s.icon sx={{ fontSize: 22 }} className={c.icon} />
                <p className="text-xl font-bold text-[#1d1d1f] dark:text-white">{s.value}</p>
                <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* ── Practice Tracks ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} className="text-amber-500" />
            <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-white">Practice Tracks</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRACKS.map((track) => {
              const c = COLOR_MAP[track.color];
              const Icon = track.icon;
              return (
                <div
                  key={track.id}
                  className={`rounded-2xl border ${c.border} bg-white dark:bg-[#16161a] p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.bg}`}>
                      <Icon sx={{ fontSize: 20 }} className={c.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">{track.label}</h3>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${c.badge}`}>
                          {track.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mt-1">{track.desc}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {track.platforms.map((p) => (
                      <a
                        key={p.name}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] transition-colors group"
                      >
                        <span className="text-xs font-medium text-[#1d1d1f] dark:text-white">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-[#86868b] dark:text-[#8e8e93]">{p.badge}</span>
                          <ExternalLink className="h-3 w-3 text-[#86868b] dark:text-[#8e8e93] group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Top Certifications ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <WorkspacePremiumRoundedIcon sx={{ fontSize: 18 }} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-white">High-Value Certifications</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CERTIFICATIONS.map((cert) => {
              const c = COLOR_MAP[cert.color];
              return (
                <a
                  key={cert.name}
                  href={cert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group rounded-xl border ${c.border} bg-white dark:bg-[#16161a] p-4 flex items-center justify-between gap-3 hover:shadow-md transition-all duration-150`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">{cert.name}</p>
                    <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mt-0.5">{cert.issuer}</p>
                  </div>
                  <ExternalLink className={`h-4 w-4 shrink-0 ${c.icon} opacity-70 group-hover:opacity-100 transition-opacity`} />
                </a>
              );
            })}
          </div>
        </div>

        {/* ── CTA strip ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-px">
          <div className="rounded-[15px] bg-gradient-to-r from-indigo-950/90 via-violet-950/90 to-purple-950/90 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Ready to prove your skills?</p>
              <p className="text-xs text-indigo-300 mt-0.5">Practice now, then ace your interview prep on Rolevo.</p>
            </div>
            <Link
              href="/interview-prep"
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} />
              Go to Interview Prep
            </Link>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
