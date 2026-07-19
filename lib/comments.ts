import type { SupabaseClient } from "@supabase/supabase-js";

import { signAttachmentUrl } from "@/lib/attachments";
import type { Comment, PostAttachment } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function fetchCommentsForPost(
  supabase: Client,
  postId: string
): Promise<Comment[]> {
  const [
    { data: comments, error: commentsError },
    { data: profiles, error: profilesError },
    { data: attachments, error: attachmentsError },
  ] = await Promise.all([
    supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name, is_admin"),
    supabase
      .from("post_attachments")
      .select("*")
      .eq("post_id", postId)
      .eq("visibility", "public")
      .not("comment_id", "is", null)
      .order("created_at", { ascending: true }),
  ]);

  if (commentsError) throw commentsError;
  if (profilesError) throw profilesError;
  if (attachmentsError) throw attachmentsError;

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  const attachmentsByComment = new Map<string, PostAttachment[]>();
  await Promise.all(
    (attachments ?? []).map(async (row) => {
      if (!row.comment_id) return;
      let url: string | null = null;
      try {
        url = await signAttachmentUrl(supabase, row.storage_path);
      } catch {
        url = null;
      }
      const list = attachmentsByComment.get(row.comment_id) ?? [];
      list.push({
        id: row.id,
        post_id: row.post_id,
        comment_id: row.comment_id,
        private_message_id: row.private_message_id,
        storage_path: row.storage_path,
        mime_type: row.mime_type,
        visibility: row.visibility,
        created_by: row.created_by,
        created_at: row.created_at,
        url,
      });
      attachmentsByComment.set(row.comment_id, list);
    })
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
      attachments: attachmentsByComment.get(comment.id) ?? [],
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
