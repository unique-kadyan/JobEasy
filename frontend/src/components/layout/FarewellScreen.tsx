"use client";

import { useEffect, useRef, useState, useMemo } from "react";

const FAREWELL_PHRASES = [
  "Your progress has been saved.",
  "Every application counts.",
  "Come back stronger tomorrow.",
  "Your dream job is getting closer.",
  "Great work today — keep it up!",
  "The perfect role is out there.",
];

const PARTICLE_COLORS = [
  "#a78bfa",
  "#818cf8",
  "#c084fc",
  "#f9a8d4",
  "#7dd3fc",
  "#6ee7b7",
  "#fda4af",
  "#fbbf24",
];

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  borderRadius: string;
  opacity: number;
  drift: number;
}

function generateParticles(count: number): Particle[] {
  const shapes = ["50%", "50% 0 50% 0", "50% 5% 50% 5%", "40% 10% 40% 10%", "30% 30% 50% 50%"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 5 + Math.random() * 10,
    duration: 3.5 + Math.random() * 4,
    delay: -(Math.random() * 7),
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    borderRadius: shapes[Math.floor(Math.random() * shapes.length)],
    opacity: 0.45 + Math.random() * 0.45,
    drift: (Math.random() - 0.5) * 60,
  }));
}

interface FarewellScreenProps {
  userName: string;
  onComplete: () => void;
}

export default function FarewellScreen({ userName, onComplete }: FarewellScreenProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const dismissedRef = useRef(false);
  const particles = useMemo(() => generateParticles(28), []);

  // Rotate phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % FAREWELL_PHRASES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss after 2.8s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setFadeOut(true);
      setTimeout(onComplete, 600);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f0a1e 0%, #1a0f35 35%, #100f25 65%, #0a0f1e 100%)",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.6s ease-out",
        pointerEvents: fadeOut ? "none" : "auto",
      }}
    >
      {/* Ascending particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute bottom-[-20px]"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.borderRadius,
                opacity: p.opacity,
                animation: `particleRise ${p.duration}s ${p.delay}s ease-in-out infinite`,
                "--drift": `${p.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Radial glow blobs */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "25%",
          left: "15%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
          animation: "welcomeGlow 5s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "20%",
          right: "12%",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 70%)",
          animation: "welcomeGlow 4s 1.5s ease-in-out infinite",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-xl px-8 text-center select-none">
        {/* Waving hand */}
        <div
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center text-5xl"
          style={{
            background: "rgba(139,92,246,0.15)",
            border: "2px solid rgba(167,139,250,0.45)",
            borderRadius: "50%",
            boxShadow: "0 0 50px rgba(139,92,246,0.35), 0 0 100px rgba(139,92,246,0.15)",
            animation:
              "waveHand 1s ease-in-out 0s 2 forwards, welcomeFadeSlideUp 0.5s ease-out both",
          }}
        >
          👋
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(1.75rem, 5vw, 2.9rem)",
            fontWeight: 800,
            color: "white",
            lineHeight: 1.15,
            marginBottom: "0.625rem",
            textShadow: "0 0 50px rgba(139,92,246,0.55)",
            animation: "welcomeFadeSlideUp 0.5s 0.1s ease-out both",
          }}
        >
          See you soon, {userName}!
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "1rem",
            fontWeight: 500,
            color: "rgba(196,181,253,0.78)",
            marginBottom: "2.25rem",
            animation: "welcomeFadeSlideUp 0.5s 0.2s ease-out both",
          }}
        >
          It was great working with you today. Come back anytime.
        </p>

        {/* Rotating motivational phrase */}
        <p
          key={phraseIndex}
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "rgba(167,139,250,0.65)",
            minHeight: "1.4rem",
            animation: "welcomeFadeSlideUp 0.4s ease-out both",
          }}
        >
          {FAREWELL_PHRASES[phraseIndex]}
        </p>

        {/* Dot indicators */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "rgba(139,92,246,0.55)",
                animation: `welcomePulse 1.2s ${i * 0.18}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* Footer label */}
        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.65rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "rgba(148,163,184,0.45)",
          }}
        >
          Logging out securely…
        </p>
      </div>
    </div>
  );
}
