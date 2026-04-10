
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const frontendUrl = process.env.RENDER_EXTERNAL_URL;
  const backendUrl  = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "");

  if (!frontendUrl) {
    console.log("[keep-alive] RENDER_EXTERNAL_URL not set — scheduler disabled (local dev)");
    return;
  }

  const INTERVAL_MS   = 20_000;
  const TIMEOUT_MS    = 8_000;
  const RETRY_DELAY   = 3_000;
  const STARTUP_DELAY = 8_000;

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
