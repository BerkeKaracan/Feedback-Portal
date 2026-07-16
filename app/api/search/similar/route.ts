import { NextResponse } from "next/server";

import {
  checkRateLimit,
  clientIpFromRequest,
} from "@/lib/rate-limit";
import { findSimilarPosts } from "@/lib/search/duplicates";
import { createClient } from "@/lib/supabase/server";

type SimilarBody = {
  title?: string;
  description?: string;
};

// Anonymous-friendly endpoint: keep abuse in check without auth.
const SIMILAR_MAX_PER_WINDOW = 40;
const SIMILAR_WINDOW_MS = 60_000;

// Local, AI-free duplicate + tag suggestions. Always available (no quota).
export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(
    `similar:${ip}`,
    SIMILAR_MAX_PER_WINDOW,
    SIMILAR_WINDOW_MS
  );

  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "Too many similarity checks. Please wait a moment and try again.",
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      }
    );
  }

  let body: SimilarBody;
  try {
    body = (await request.json()) as SimilarBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, description, tags, status")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = findSimilarPosts({ title, description }, posts ?? []);

  return NextResponse.json({
    duplicates: result.duplicates.slice(0, 5),
    tags: result.tags,
    strongDuplicate: result.strongDuplicate,
    mode: "local",
  });
}
