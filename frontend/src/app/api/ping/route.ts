import { NextResponse } from "next/server";

const START_TIME = Date.now();

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      ts: new Date().toISOString(),
      uptimeMs: Date.now() - START_TIME,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
