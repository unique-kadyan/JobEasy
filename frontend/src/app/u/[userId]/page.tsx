import type { Metadata } from "next";
import Link from "next/link";

interface PublicProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  summary: string;
  experienceYears: number;
  targetRoles: string[];
  skills: Record<string, unknown>;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

async function fetchProfile(userId: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/public/profile/${userId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const profile = await fetchProfile(userId);
  if (!profile) {
    return { title: "Profile not found — Rolevo" };
  }
  return {
    title: `${profile.name} — ${profile.title || "Professional"} | Rolevo`,
    description:
      profile.summary?.slice(0, 160) || `${profile.name}'s professional profile on Rolevo.`,
    openGraph: {
      title: `${profile.name} | Rolevo`,
      description: profile.summary?.slice(0, 160) || "",
      images: profile.avatarUrl?.startsWith("http") ? [profile.avatarUrl] : [],
    },
  };
}

function SkillPills({ skills }: { skills: Record<string, unknown> }) {
  const flat: string[] = [];
  for (const val of Object.values(skills)) {
    if (Array.isArray(val)) flat.push(...(val as string[]));
    else if (typeof val === "string") flat.push(val);
  }
  const unique = [...new Set(flat)].slice(0, 24);
  if (unique.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {unique.map((s) => (
        <span
          key={s}
          className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-700/50 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await fetchProfile(userId);

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f5f7] px-4 dark:bg-[#0a0a0f]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8e8ed] text-3xl dark:bg-[#1c1c1e]">
          😶
        </div>
        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">Profile not found</h1>
        <p className="max-w-xs text-center text-sm text-[#86868b]">
          This profile doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Back to Rolevo
        </Link>
      </div>
    );
  }

  const initials = profile.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0f]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0a0a0f]/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-base font-bold text-indigo-600 dark:text-indigo-400">
            Rolevo
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Sign up free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        {/* Avatar + Identity */}
        <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#16161a]">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-[#1d1d1f] dark:text-white">{profile.name}</h1>
              {profile.title && (
                <p className="mt-0.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {profile.title}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#86868b] dark:text-[#8e8e93]">
                {profile.location && <span>📍 {profile.location}</span>}
                {profile.experienceYears > 0 && (
                  <span>
                    🧑‍💻 {profile.experienceYears} yr{profile.experienceYears !== 1 ? "s" : ""}{" "}
                    experience
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700/50 dark:bg-blue-900/20 dark:text-blue-300"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-[#f2f2f7] px-3 py-1 text-[11px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] dark:border-white/[0.08] dark:bg-[#2c2c2e] dark:text-white dark:hover:bg-[#3a3a3c]"
                  >
                    GitHub ↗
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                  >
                    Portfolio ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {profile.summary && (
            <div className="mt-5 border-t border-black/[0.06] pt-5 dark:border-white/[0.07]">
              <p className="text-sm leading-relaxed text-[#1d1d1f] opacity-80 dark:text-white">
                {profile.summary}
              </p>
            </div>
          )}
        </div>

        {/* Target Roles */}
        {profile.targetRoles?.length > 0 && (
          <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#16161a]">
            <h2 className="mb-3 text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Looking for
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.targetRoles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills && Object.keys(profile.skills).length > 0 && (
          <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#16161a]">
            <h2 className="mb-3 text-sm font-semibold text-[#1d1d1f] dark:text-white">Skills</h2>
            <SkillPills skills={profile.skills} />
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-px">
          <div className="rounded-[15px] bg-gradient-to-r from-indigo-950/90 to-violet-950/90 px-6 py-5 text-center">
            <p className="text-sm font-semibold text-white">Land your dream job faster</p>
            <p className="mt-1 mb-4 text-xs text-indigo-300">
              Auto-apply, AI cover letters, interview prep — all in one place.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
