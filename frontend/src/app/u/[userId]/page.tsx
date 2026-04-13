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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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
    description: profile.summary?.slice(0, 160) || `${profile.name}'s professional profile on Rolevo.`,
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
          className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50"
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f5f7] dark:bg-[#0a0a0f] px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#e8e8ed] dark:bg-[#1c1c1e] flex items-center justify-center text-3xl">
          😶
        </div>
        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">Profile not found</h1>
        <p className="text-sm text-[#86868b] text-center max-w-xs">
          This profile doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
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
      <header className="border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-base font-bold text-indigo-600 dark:text-indigo-400">
            Rolevo
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign up free
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Avatar + Identity */}
        <div className="rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-indigo-600 flex items-center justify-center">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#1d1d1f] dark:text-white">{profile.name}</h1>
              {profile.title && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{profile.title}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#86868b] dark:text-[#8e8e93]">
                {profile.location && <span>📍 {profile.location}</span>}
                {profile.experienceYears > 0 && (
                  <span>🧑‍💻 {profile.experienceYears} yr{profile.experienceYears !== 1 ? "s" : ""} experience</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 transition-colors"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white text-[11px] font-semibold border border-black/[0.08] dark:border-white/[0.08] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] transition-colors"
                  >
                    GitHub ↗
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100 transition-colors"
                  >
                    Portfolio ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {profile.summary && (
            <div className="mt-5 pt-5 border-t border-black/[0.06] dark:border-white/[0.07]">
              <p className="text-sm text-[#1d1d1f] dark:text-white opacity-80 leading-relaxed">
                {profile.summary}
              </p>
            </div>
          )}
        </div>

        {/* Target Roles */}
        {profile.targetRoles?.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-3">Looking for</h2>
            <div className="flex flex-wrap gap-2">
              {profile.targetRoles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills && Object.keys(profile.skills).length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.05] dark:border-white/[0.07] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-3">Skills</h2>
            <SkillPills skills={profile.skills} />
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-px">
          <div className="rounded-[15px] bg-gradient-to-r from-indigo-950/90 to-violet-950/90 px-6 py-5 text-center">
            <p className="text-sm font-semibold text-white">Land your dream job faster</p>
            <p className="text-xs text-indigo-300 mt-1 mb-4">
              Auto-apply, AI cover letters, interview prep — all in one place.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50 transition-colors"
            >
              Get started free →
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
