/**
 * Next.js instrumentation hook — runs once when the Node.js server starts.
 * Not during hot-reload. Not in the browser. Not in the Edge runtime.
 *
 * ROLE: Keep both Render free-tier instances (frontend + backend) permanently
 * awake by pinging their public URLs every 20 seconds.
 *
 * WHY 20 SECONDS:
 * Render suspends a free service after ~35 seconds of no incoming traffic at
 * its edge router. Pinging every 20 s keeps a 15-second safety margin.
 *
 * WHY PUBLIC URL (not localhost):
 * Only requests that hit Render's edge router reset the inactivity timer. A
 * loopback call never reaches the router. RENDER_EXTERNAL_URL (auto-injected
 * by Render) is the service's own public URL — calling it routes through
 * Render's infrastructure and counts as real traffic.
 *
 * CROSS-INSTANCE REDUNDANCY:
 * Both this scheduler (frontend) and SelfPingScheduler.java (backend) ping
 * each other. If either service wakes first, it immediately starts keeping
 * the other alive — no single point of failure.
 *
 * RETRY ON FAILURE:
 * If a ping fails (transient network error, service restarting), we retry
 * once after 3 seconds before logging a warning. This tolerates brief
 * interruptions without waiting the full 20-second interval.
 *
 * LOCAL DEV:
 * Scheduler is skipped entirely when RENDER_EXTERNAL_URL is absent — zero
 * noise during local development.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const frontendUrl = process.env.RENDER_EXTERNAL_URL;
  const backendUrl  = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "");

  if (!frontendUrl) {
    console.log("[keep-alive] RENDER_EXTERNAL_URL not set — scheduler disabled (local dev)");
    return;
  }

  const INTERVAL_MS   = 20_000;  // 20 s — under Render's 35 s freeze threshold
  const TIMEOUT_MS    = 8_000;
  const RETRY_DELAY   = 3_000;
  const STARTUP_DELAY = 8_000;   // 8 s — first ping fires before the 35 s freeze window

  const targets: Array<{ name: string; url: string }> = [
    { name: "frontend", url: `${frontendUrl}/api/ping` },
  ];
  if (backendUrl) {
    targets.push({ name: "backend", url: `${backendUrl}/api/ping` });
  }

  console.log(
    `[keep-alive] Scheduler starting in ${STARTUP_DELAY / 1000}s. Targets:`,
    targets.map((t) => t.url).join(", ")
  );

  const failures: Record<string, number> = {};

  async function pingOnce(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async function pingTarget(target: { name: string; url: string }) {
    let ok = await pingOnce(target.url);

    // Retry once after 3 s on failure before counting it as a miss.
    if (!ok) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      ok = await pingOnce(target.url);
    }

    if (ok) {
      failures[target.name] = 0;
    } else {
      const n = (failures[target.name] = (failures[target.name] ?? 0) + 1);
      if (n === 1 || n % 5 === 0) {
        console.warn(`[keep-alive] ${target.name} unreachable after retry (consecutive: ${n})`);
      }
    }
  }

  function runCycle() {
    for (const target of targets) {
      pingTarget(target).catch(() => {});
    }
  }

  setTimeout(() => {
    runCycle();
    setInterval(runCycle, INTERVAL_MS);
  }, STARTUP_DELAY);
}
