import { NextResponse } from "next/server";

import { findSimilarPosts } from "@/lib/search/duplicates";
import { createClient } from "@/lib/supabase/server";

type SimilarBody = {
  title?: string;
  description?: string;
};

// Local, AI-free duplicate + tag suggestions. Always available (no quota).
export async function POST(request: Request) {
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
    .limit(500);

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
