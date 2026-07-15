import type { SupabaseClient } from "@supabase/supabase-js";

import type { Comment } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function fetchCommentsForPost(
  supabase: Client,
  postId: string
): Promise<Comment[]> {
  const [{ data: comments, error: commentsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, display_name, is_admin"),
    ]);

  if (commentsError) throw commentsError;
  if (profilesError) throw profilesError;

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  return (comments ?? []).map((comment) => {
    const profile = profileById.get(comment.user_id);
    return {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      author_name:
        profile?.display_name ?? `User ${comment.user_id.slice(0, 8)}`,
      is_admin: Boolean(profile?.is_admin),
    };
  });
}

export async function createComment(
  supabase: Client,
  input: { postId: string; userId: string; content: string }
) {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      content: input.content.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(supabase: Client, commentId: string) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}
