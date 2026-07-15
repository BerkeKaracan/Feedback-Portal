import type { SupabaseClient } from "@supabase/supabase-js";

import type { Post, PostStatus } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function fetchPostsWithVotes(
  supabase: Client,
  userId?: string | null
): Promise<Post[]> {
  const [
    { data: posts, error: postsError },
    { data: votes, error: votesError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase.from("posts").select("*").order("created_at", { ascending: false }),
    supabase.from("votes").select("post_id, user_id"),
    supabase.from("profiles").select("id, display_name"),
  ]);

  if (postsError) throw postsError;
  if (votesError) throw votesError;
  if (profilesError) throw profilesError;

  const displayNameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name])
  );

  const voteCountByPost = new Map<string, number>();
  const votedPostIds = new Set<string>();

  for (const vote of votes ?? []) {
    voteCountByPost.set(
      vote.post_id,
      (voteCountByPost.get(vote.post_id) ?? 0) + 1
    );
    if (userId && vote.user_id === userId) {
      votedPostIds.add(vote.post_id);
    }
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
    created_at: post.created_at,
    has_voted: votedPostIds.has(post.id),
  }));
}

export async function createPost(
  supabase: Client,
  input: { title: string; description: string; authorId: string }
) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: input.title,
      description: input.description,
      author_id: input.authorId,
      status: "idea",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleVote(
  supabase: Client,
  input: { postId: string; userId: string; hasVoted: boolean }
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
  status: PostStatus
) {
  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) throw error;
}
