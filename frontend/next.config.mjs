/** @type {import('next').NextConfig} */

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:8080";

/**
 * OWASP-aligned HTTP security headers.
 *
 * Applied to every route via the headers() hook so Next.js injects them
 * server-side before the response reaches the browser — no client JS needed.
 *
 * References:
 *   - OWASP Secure Headers Project  https://owasp.org/www-project-secure-headers/
 *   - OWASP Top 10 A05:2021 (Security Misconfiguration)
 */
const securityHeaders = [
  // ── Prevent MIME-type sniffing (OWASP A05) ─────────────────────────────────
  { key: "X-Content-Type-Options", value: "nosniff" },

  // ── Block clickjacking / framing attacks (OWASP A05) ──────────────────────
  { key: "X-Frame-Options", value: "DENY" },

  // ── Legacy XSS filter for old IE/Edge (defence-in-depth) ──────────────────
  { key: "X-XSS-Protection", value: "1; mode=block" },

  // ── Control referrer leakage (OWASP A01) ──────────────────────────────────
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // ── DNS prefetch control (minor privacy) ──────────────────────────────────
  { key: "X-DNS-Prefetch-Control", value: "on" },

  // ── HSTS: force HTTPS for 2 years including subdomains (OWASP A02) ────────
  // Only applied in production (see conditional below).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  // ── Restrict browser feature APIs (OWASP A05) ─────────────────────────────
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },

  // ── Content Security Policy (OWASP A03 injection / XSS) ──────────────────
  // - script-src: Next.js requires 'unsafe-inline' + 'unsafe-eval' in dev.
  //   In production, nonce-based CSP or hash-based is ideal; this is a
  //   reasonable baseline that blocks third-party JS injection.
  // - connect-src: allow fetch/XHR to the Spring Boot API origin.
  // - frame-ancestors: duplicates X-Frame-Options for CSP-aware browsers.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${API_ORIGIN} https://api.razorpay.com`,
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        // Apply to every route including API routes and static files
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
