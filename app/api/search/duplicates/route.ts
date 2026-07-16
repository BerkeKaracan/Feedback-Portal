import { NextResponse } from "next/server";

import { scanDuplicateGroups } from "@/lib/search/duplicates";
import { createClient } from "@/lib/supabase/server";

async function requireBoardAdmin(projectId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: "Authentication required", status: 401 } as const;
  }

  if (!projectId) {
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

  const { data: allowed } = await supabase.rpc("is_project_admin", {
    p_project_id: projectId,
  });

  if (!allowed) {
    return { supabase, error: "Admin access required", status: 403 } as const;
  }

  return { supabase } as const;
}

// Local duplicate scan (no AI, no quota). Returns clustered groups.
export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId");
  const auth = await requireBoardAdmin(projectId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let postsQuery = auth.supabase
    .from("posts")
    .select("id, title, description, status");

  postsQuery = projectId
    ? postsQuery.eq("project_id", projectId)
    : postsQuery.is("project_id", null);

  const { data: posts, error } = await postsQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const postIds = (posts ?? []).map((post) => post.id);
  const { data: voteCounts, error: votesError } = await auth.supabase.rpc(
    "post_vote_counts"
  );

  if (votesError) {
    return NextResponse.json({ error: votesError.message }, { status: 500 });
  }

  const voteCountByPost = new Map(
    (voteCounts ?? []).map((row) => [row.post_id, Number(row.vote_count)])
  );

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: canonical } = await supabase
    .from("posts")
    .select("project_id")
    .eq("id", body.canonicalPostId)
    .maybeSingle();

  const auth = await requireBoardAdmin(canonical?.project_id ?? null);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
