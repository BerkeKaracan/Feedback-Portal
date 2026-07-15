import { NextResponse } from "next/server";

import { analyzeIdeaLocally } from "@/lib/ai/analyze";
import type { AnalyzeIdeaRequest, AnalyzeIdeaResponse } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: AnalyzeIdeaRequest;

  try {
    body = (await request.json()) as AnalyzeIdeaRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";

  if (!title || !description) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 }
    );
  }

  const payload: AnalyzeIdeaRequest = { title, description };
  const aiServiceUrl = process.env.AI_SERVICE_URL?.replace(/\/$/, "");

  if (aiServiceUrl) {
    try {
      const upstream = await fetch(`${aiServiceUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!upstream.ok) {
        return NextResponse.json(
          { error: "AI service request failed" },
          { status: 502 }
        );
      }

      const data = (await upstream.json()) as AnalyzeIdeaResponse;
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: "AI service unreachable" },
        { status: 502 }
      );
    }
  }

  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, description")
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: AnalyzeIdeaResponse = analyzeIdeaLocally(
    payload,
    posts ?? []
  );
  return NextResponse.json(result);
}
