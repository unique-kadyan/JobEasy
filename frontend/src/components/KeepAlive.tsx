"use client";

import { useEffect } from "react";

// Ping the backend every 45 seconds so the Render instance stays warm.
// This component renders nothing — it only drives the keep-alive side-effect.
const BACKEND_PING_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api") + "/ping";

const INTERVAL_MS = 45_000;

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => {
      // mode: "no-cors" avoids CORS preflight entirely — we only need the
      // server to receive the request to stay warm; the response is not read.
      fetch(BACKEND_PING_URL, { method: "GET", mode: "no-cors" }).catch(
        () => {} // silently ignore — network may be temporarily unavailable
      );
    };

    // Fire immediately so the first ping doesn't wait 45 s after page load
    ping();
    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
