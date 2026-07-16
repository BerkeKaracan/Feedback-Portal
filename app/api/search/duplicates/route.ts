import { NextResponse } from "next/server";

import { scanDuplicateGroups } from "@/lib/search/duplicates";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: "Authentication required", status: 401 } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return { supabase, error: "Admin access required", status: 403 } as const;
  }

  return { supabase } as const;
}

// Local duplicate scan (no AI, no quota). Returns clustered groups.
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: posts, error } = await auth.supabase
    .from("posts")
    .select("id, title, description");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const postIds = (posts ?? []).map((post) => post.id);
  const { data: votes, error: votesError } = await auth.supabase
    .from("votes")
    .select("post_id");

  if (votesError) {
    return NextResponse.json({ error: votesError.message }, { status: 500 });
  }

  const voteCountByPost = new Map<string, number>();
  for (const vote of votes ?? []) {
    voteCountByPost.set(vote.post_id, (voteCountByPost.get(vote.post_id) ?? 0) + 1);
  }

  const enriched = (posts ?? []).map((post) => ({
    ...post,
    vote_count: voteCountByPost.get(post.id) ?? 0,
  }));

  const groups = scanDuplicateGroups(enriched);
  return NextResponse.json({ groups, scanned: postIds.length });
}

type MergeBody = {
  canonicalPostId?: string;
  duplicatePostIds?: string[];
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: MergeBody;
  try {
    body = (await request.json()) as MergeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const duplicatePostIds = [
    ...new Set(
      (body.duplicatePostIds ?? []).filter(
        (postId): postId is string => typeof postId === "string"
      )
    ),
  ];

  if (!body.canonicalPostId || duplicatePostIds.length === 0) {
    return NextResponse.json(
      { error: "canonicalPostId and duplicatePostIds are required" },
      { status: 400 }
    );
  }

  const { error } = await auth.supabase.rpc("merge_duplicate_posts", {
    canonical_post_id: body.canonicalPostId,
    duplicate_post_ids: duplicatePostIds,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ merged: true });
}
