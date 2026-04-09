import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Edge Middleware — runs before every request on the matched routes.
 *
 * Responsibilities:
 * 1. **Route protection** — unauthenticated users are redirected to /login
 *    when they try to access any dashboard route.
 * 2. **Auth-page bypass** — users with an active session are redirected to
 *    /dashboard instead of being shown the login/signup pages.
 *
 * Implementation note:
 *   The actual JWT is stored in Zustand (localStorage) and is inaccessible in
 *   Edge middleware.  We therefore use a lightweight `kaddy-session` cookie
 *   that is set on login and cleared on logout.  The cookie holds no sensitive
 *   data — real token validation still happens on the Spring Boot backend for
 *   every API call (OWASP A01 enforcement via JwtAuthenticationFilter).
 *
 *   This middleware is a UX-layer guard only; it prevents unnecessary round-
 *   trips to protected pages but does NOT replace server-side JWT validation.
 */

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/applications",
  "/resumes",
  "/cover-letters",
  "/profile",
  "/settings",
  "/analytics",
  "/smart-resume",
];

/** Routes that authenticated users should be redirected away from. */
const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  // `kaddy-session` is a non-httpOnly, SameSite=Strict presence cookie.
  // It carries no token data — its mere existence signals that the user has
  // a valid session according to the client-side auth store.
  const hasSession = request.cookies.has("kaddy-session");

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the intended destination so we can redirect after login.
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

/**
 * Matcher excludes Next.js internals and static files so middleware only
 * runs on actual page navigations — not on every asset request.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
