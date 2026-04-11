"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

interface WelcomeScreenProps {
  type: "login" | "signup";
  userName: string;
  onComplete: () => void;
}

const SLOGANS_LOGIN = [
  "Your AI job search companion is ready.",
  "Let's find your next opportunity.",
  "Smart applications, smarter career.",
  "Every great career starts with one click.",
];

const SLOGANS_SIGNUP = [
  "Your AI job search companion is ready.",
  "Let AI handle the heavy lifting.",
  "Your dream role is closer than you think.",
  "Welcome to effortless job searching.",
];

const PETAL_COLORS = [
  "#fda4af",
  "#fb7185",
  "#f9a8d4",
  "#c084fc",
  "#a78bfa",
  "#818cf8",
  "#7dd3fc",
  "#6ee7b7",
];

interface Petal {
  id: number;
  left: number;
  width: number;
  height: number;
  duration: number;
  delay: number;
  color: string;
  initialRotation: number;
  borderRadius: string;
  opacity: number;
}

function generatePetals(count: number): Petal[] {
  const borderRadii = [
    "50% 0 50% 0",
    "50% 5% 50% 5%",
    "60% 5% 60% 5%",
    "40% 10% 40% 10%",
    "50% 50% 30% 30%",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 102 - 1,
    width: 8 + Math.random() * 12,
    height: 12 + Math.random() * 14,
    duration: 5 + Math.random() * 6,
    delay: -(Math.random() * 8),
    color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
    initialRotation: Math.random() * 360,
    borderRadius: borderRadii[Math.floor(Math.random() * borderRadii.length)],
    opacity: 0.55 + Math.random() * 0.35,
  }));
}

export default function WelcomeScreen({ type, userName, onComplete }: WelcomeScreenProps) {
  const queryClient = useQueryClient();
  const [sloganIndex, setSloganIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const dismissedRef = useRef(false);
  const slogans = type === "login" ? SLOGANS_LOGIN : SLOGANS_SIGNUP;
  const petals = useMemo(() => generatePetals(32), []);

  const greeting =
    type === "login"
      ? `Welcome Back, ${userName}!`
      : `Welcome to Kaddy, ${userName}!`;

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganIndex((i) => (i + 1) % slogans.length);
    }, 1300);
    return () => clearInterval(interval);
  }, [slogans.length]);

  useEffect(() => {
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 3500));

    const prefetches = Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["analytics"],
        queryFn: () => api.get("/analytics/summary").then((r) => r.data),
        staleTime: 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["resumes"],
        queryFn: () =>
          api
            .get("/resumes", { params: { page: 0, size: 20 } })
            .then((r) => (Array.isArray(r.data) ? r.data : (r.data.content ?? []))),
        staleTime: 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["applications", { page: 0 }],
        queryFn: () =>
          api
            .get("/applications", { params: { page: 0, size: 20 } })
            .then((r) => r.data),
        staleTime: 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["cover-letters"],
        queryFn: () =>
          api
            .get("/cover-letters", { params: { page: 0, size: 10 } })
            .then((r) => r.data),
        staleTime: 60_000,
      }),
    ]);

    Promise.all([minDelay, prefetches]).then(() => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setFadeOut(true);
      setTimeout(onComplete, 650);
    });
  }, [queryClient, onComplete]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0a0f1e 0%, #1a1040 40%, #0f1a2e 70%, #0a0f1e 100%)",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.65s ease-out",
        pointerEvents: fadeOut ? "none" : "auto",
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {petals.map((petal) => (
          <div
            key={petal.id}
            className="absolute top-0"
            style={{
              left: `${petal.left}%`,
              width: petal.width,
              height: petal.height,
              backgroundColor: petal.color,
              borderRadius: petal.borderRadius,
              transform: `rotate(${petal.initialRotation}deg)`,
              opacity: petal.opacity,
              animation: `petalFall ${petal.duration}s ${petal.delay}s linear infinite`,
            }}
          />
        ))}
      </div>

      <div
        className="absolute pointer-events-none"
        style={{
          top: "25%",
          left: "15%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
          animation: "welcomeGlow 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "20%",
          right: "10%",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(244,114,182,0.14) 0%, transparent 70%)",
          animation: "welcomeGlow 5s 1s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 text-center px-8 max-w-2xl mx-auto">
        <div
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center"
          style={{
            background: "rgba(99,102,241,0.2)",
            border: "3px solid rgba(129,140,248,0.8)",
            borderRadius: "8px",
            boxShadow: "6px 6px 0 rgba(99,102,241,0.5)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 4L24.5 15.5H36.5L26.5 22.5L30.5 34L20 27L9.5 34L13.5 22.5L3.5 15.5H15.5L20 4Z"
              fill="rgba(167,139,250,0.9)"
              stroke="rgba(196,181,253,0.7)"
              strokeWidth="1"
            />
          </svg>
        </div>

        <h1
          className="font-black text-white mb-4 uppercase tracking-tight"
          style={{
            fontSize: "clamp(1.8rem, 5vw, 3.2rem)",
            lineHeight: 1.15,
            textShadow: "3px 3px 0 rgba(99,102,241,0.6)",
            animation: "welcomeFadeSlideUp 0.6s ease-out both",
          }}
        >
          {greeting}
        </h1>

        <p
          key={sloganIndex}
          className="text-base font-bold"
          style={{
            color: "rgba(196,181,253,0.85)",
            animation: "welcomeFadeSlideUp 0.45s ease-out both",
            minHeight: "1.75rem",
          }}
        >
          {slogans[sloganIndex]}
        </p>

        <div className="flex items-center justify-center gap-2 mt-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "2px",
                border: "2px solid rgba(129,140,248,0.8)",
                backgroundColor: "rgba(129,140,248,0.4)",
                animation: `welcomePulse 1.5s ${i * 0.22}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        <p
          className="mt-6 text-xs font-black uppercase tracking-widest"
          style={{ color: "rgba(148,163,184,0.6)" }}
        >
          Preparing your dashboard…
        </p>
      </div>
    </div>
  );
}
