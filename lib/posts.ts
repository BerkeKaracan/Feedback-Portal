import type { SupabaseClient } from "@supabase/supabase-js";

import { suggestTags } from "@/lib/search/text-similarity";
import type { Post, PostStatus } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function cleanTags(tags: string[]) {
  return [
    ...new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  ];
}

export type FetchPostsOptions = {
  /** When set, only that project's posts. When null/omitted with `universalOnly`, default board. */
  projectId?: string | null;
  /** If true and projectId is null/undefined, return only posts with no project (universal board). */
  universalOnly?: boolean;
};

export async function fetchPostsWithVotes(
  supabase: Client,
  userId?: string | null,
  options?: FetchPostsOptions,
): Promise<Post[]> {
  let postsQuery = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.projectId) {
    postsQuery = postsQuery.eq("project_id", options.projectId);
  } else if (options?.universalOnly) {
    postsQuery = postsQuery.is("project_id", null);
  }

  const [
    { data: posts, error: postsError },
    { data: voteCounts, error: votesError },
    { data: myVotes, error: myVotesError },
    { data: profiles, error: profilesError },
    { data: comments, error: commentsError },
  ] = await Promise.all([
    postsQuery,
    supabase.rpc("post_vote_counts"),
    userId
      ? supabase.from("votes").select("post_id").eq("user_id", userId)
      : Promise.resolve({ data: [] as Array<{ post_id: string }>, error: null }),
    supabase.from("profiles").select("id, display_name"),
    supabase.from("comments").select("post_id"),
  ]);

  if (postsError) throw postsError;
  if (votesError) throw votesError;
  if (myVotesError) throw myVotesError;
  if (profilesError) throw profilesError;
  if (commentsError) throw commentsError;

  const displayNameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  const voteCountByPost = new Map(
    (voteCounts ?? []).map((row) => [row.post_id, Number(row.vote_count)]),
  );
  const votedPostIds = new Set((myVotes ?? []).map((vote) => vote.post_id));
  const commentCountByPost = new Map<string, number>();

  for (const comment of comments ?? []) {
    commentCountByPost.set(
      comment.post_id,
      (commentCountByPost.get(comment.post_id) ?? 0) + 1,
    );
  }

  return (posts ?? []).map((post) => ({
    id: post.id,
    title: post.title,
    description: post.description,
    status: post.status,
    author_id: post.author_id,
    author_name:
      displayNameById.get(post.author_id) ??
      `User ${post.author_id.slice(0, 8)}`,
    vote_count: voteCountByPost.get(post.id) ?? 0,
    comment_count: commentCountByPost.get(post.id) ?? 0,
    created_at: post.created_at,
    tags: post.tags ?? [],
    project_id: post.project_id ?? null,
    has_voted: votedPostIds.has(post.id),
  }));
}

export async function createPost(
  supabase: Client,
  input: {
    title: string;
    description: string;
    authorId: string;
    tags?: string[];
    projectId?: string | null;
  },
) {
  const provided = cleanTags(input.tags ?? []);
  const tags =
    provided.length > 0
      ? provided
      : suggestTags({ title: input.title, description: input.description });

  const { data, error } = await supabase.rpc("create_post_with_vote", {
    post_title: input.title,
    post_description: input.description,
    post_tags: tags,
    post_project_id: input.projectId ?? null,
  });

  if (error) throw error;
  if (!data) throw new Error("Failed to create post");

  return data;
}

export async function toggleVote(
  supabase: Client,
  input: { postId: string; userId: string; hasVoted: boolean },
) {
  if (input.hasVoted) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("post_id", input.postId)
      .eq("user_id", input.userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("votes").insert({
    post_id: input.postId,
    user_id: input.userId,
  });
  if (error) throw error;
}

export async function updatePostStatus(
  supabase: Client,
  postId: string,
  status: PostStatus,
) {
  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) throw error;
}

export async function updatePostTags(
  supabase: Client,
  postId: string,
  tags: string[],
) {
  const cleaned = [
    ...new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  ];

  const { data, error } = await supabase
    .from("posts")
    .update({ tags: cleaned })
    .eq("id", postId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(supabase: Client, postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function updateDisplayName(
  supabase: Client,
  userId: string,
  displayName: string,
) {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error("Display name is required");

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", userId)
    .select("id, display_name, is_admin, created_at")
    .single();

  if (error) throw error;
  return data;
}
