import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 1800; // cache 30 min

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  tag_list: string[];
  reading_time_minutes: number;
  user: { name: string };
}

export async function GET() {
  try {
    const tags = ["career", "jobs", "productivity", "programming"];
    const responses = await Promise.allSettled(
      tags.map((tag) =>
        fetch(`https://dev.to/api/articles?tag=${tag}&per_page=4&state=rising`, {
          next: { revalidate: 1800 },
        }).then((r) => r.json() as Promise<DevToArticle[]>)
      )
    );

    const seen = new Set<number>();
    const articles: DevToArticle[] = [];
    for (const res of responses) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        for (const a of res.value) {
          if (!seen.has(a.id)) {
            seen.add(a.id);
            articles.push(a);
          }
        }
      }
    }

    // Sort by recency, cap at 8
    articles.sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    const feed = articles.slice(0, 8).map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.description?.slice(0, 120) || "",
      url: a.url,
      publishedAt: a.published_at,
      author: a.user?.name || "Dev.to",
      tags: a.tag_list?.slice(0, 3) || [],
      readingTime: a.reading_time_minutes,
    }));

    return NextResponse.json(feed, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
