import type { SupabaseClient } from "@supabase/supabase-js";

import { signAttachmentUrl } from "@/lib/attachments";
import type { PostAttachment, PrivateMessage } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function mapAttachment(
  row: Database["public"]["Tables"]["post_attachments"]["Row"],
  url?: string | null
): PostAttachment {
  return {
    id: row.id,
    post_id: row.post_id,
    comment_id: row.comment_id,
    private_message_id: row.private_message_id,
    storage_path: row.storage_path,
    mime_type: row.mime_type,
    visibility: row.visibility,
    created_by: row.created_by,
    created_at: row.created_at,
    url: url ?? null,
  };
}

export async function fetchPrivateMessagesForPost(
  supabase: Client,
  postId: string
): Promise<PrivateMessage[]> {
  const [
    { data: messages, error: messagesError },
    { data: profiles, error: profilesError },
    { data: attachments, error: attachmentsError },
  ] = await Promise.all([
    supabase
      .from("post_private_messages")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name"),
    supabase
      .from("post_attachments")
      .select("*")
      .eq("post_id", postId)
      .eq("visibility", "admin_only")
      .order("created_at", { ascending: true }),
  ]);

  if (messagesError) throw messagesError;
  if (profilesError) throw profilesError;
  if (attachmentsError) throw attachmentsError;

  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name])
  );

  const attachmentsByMessage = new Map<string, PostAttachment[]>();
  await Promise.all(
    (attachments ?? []).map(async (row) => {
      if (!row.private_message_id) return;
      let url: string | null = null;
      try {
        url = await signAttachmentUrl(supabase, row.storage_path);
      } catch {
        url = null;
      }
      const list = attachmentsByMessage.get(row.private_message_id) ?? [];
      list.push(mapAttachment(row, url));
      attachmentsByMessage.set(row.private_message_id, list);
    })
  );

  return (messages ?? []).map((message) => ({
    id: message.id,
    post_id: message.post_id,
    author_id: message.author_id,
    content: message.content,
    created_at: message.created_at,
    author_name:
      nameById.get(message.author_id) ?? `User ${message.author_id.slice(0, 8)}`,
    attachments: attachmentsByMessage.get(message.id) ?? [],
  }));
}

export async function createPrivateMessage(
  supabase: Client,
  input: { postId: string; userId: string; content: string }
) {
  const { data, error } = await supabase
    .from("post_private_messages")
    .insert({
      post_id: input.postId,
      author_id: input.userId,
      content: input.content.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
