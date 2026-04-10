"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const API_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api")
    : "";

const INTERVAL_UP_MS = 25_000;

const INTERVAL_DOWN_MS = 5_000;
const TIMEOUT_MS = 8_000;

export type ServerStatus = "up" | "down" | "connecting";

export function useKeepAlive(): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>("connecting");
  const statusRef = useRef<ServerStatus>("connecting");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const scheduleNext = useCallback((currentStatus: ServerStatus) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = currentStatus === "up" ? INTERVAL_UP_MS : INTERVAL_DOWN_MS;
    timerRef.current = setTimeout(runPing, delay);
  }, []);

  const runPing = useCallback(async () => {
    if (!mountedRef.current) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${API_URL}/ping`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      const next: ServerStatus = res.ok ? "up" : "down";
      statusRef.current = next;
      setStatus(next);
      scheduleNext(next);
    } catch {
      if (!mountedRef.current) return;
      statusRef.current = "down";
      setStatus("down");
      scheduleNext("down");
    } finally {
      clearTimeout(timeout);
    }
  }, [scheduleNext]);

  useEffect(() => {
    mountedRef.current = true;

    runPing();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (timerRef.current) clearTimeout(timerRef.current);
        runPing();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runPing]);

  return status;
}
