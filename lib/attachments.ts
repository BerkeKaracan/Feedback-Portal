import type { SupabaseClient } from "@supabase/supabase-js";

import type { AttachmentVisibility, PostAttachment } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export const ATTACHMENT_BUCKET = "feedback-attachments";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

function extensionForMime(mime: AllowedImageType) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function assertImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 2 MB or smaller.");
  }
}

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

export async function signAttachmentUrl(
  supabase: Client,
  storagePath: string,
  expiresIn = 3600
) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function fetchPublicAttachmentsForPosts(
  supabase: Client,
  postIds: string[]
): Promise<Map<string, PostAttachment[]>> {
  const result = new Map<string, PostAttachment[]>();
  if (postIds.length === 0) return result;

  const { data, error } = await supabase
    .from("post_attachments")
    .select("*")
    .in("post_id", postIds)
    .eq("visibility", "public")
    .is("comment_id", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  for (const row of data ?? []) {
    const list = result.get(row.post_id) ?? [];
    list.push(mapAttachment(row));
    result.set(row.post_id, list);
  }

  // Sign URLs in parallel (best-effort per row).
  const entries = [...result.entries()];
  await Promise.all(
    entries.map(async ([postId, attachments]) => {
      const withUrls = await Promise.all(
        attachments.map(async (attachment) => {
          try {
            const url = await signAttachmentUrl(supabase, attachment.storage_path);
            return { ...attachment, url };
          } catch {
            return attachment;
          }
        })
      );
      result.set(postId, withUrls);
    })
  );

  return result;
}

export async function fetchAttachmentsForPost(
  supabase: Client,
  postId: string,
  options?: { includeAdminOnly?: boolean }
): Promise<PostAttachment[]> {
  let query = supabase
    .from("post_attachments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (!options?.includeAdminOnly) {
    query = query.eq("visibility", "public");
  }

  const { data, error } = await query;
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (row) => {
      try {
        const url = await signAttachmentUrl(supabase, row.storage_path);
        return mapAttachment(row, url);
      } catch {
        return mapAttachment(row);
      }
    })
  );
}

export async function fetchAttachmentsForComment(
  supabase: Client,
  commentId: string
): Promise<PostAttachment[]> {
  const { data, error } = await supabase
    .from("post_attachments")
    .select("*")
    .eq("comment_id", commentId)
    .eq("visibility", "public")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (row) => {
      try {
        const url = await signAttachmentUrl(supabase, row.storage_path);
        return mapAttachment(row, url);
      } catch {
        return mapAttachment(row);
      }
    })
  );
}

export async function uploadPostAttachment(
  supabase: Client,
  input: {
    postId: string;
    userId: string;
    file: File;
    visibility: AttachmentVisibility;
    commentId?: string | null;
    privateMessageId?: string | null;
  }
) {
  assertImageFile(input.file);
  const mime = input.file.type as AllowedImageType;
  const ext = extensionForMime(mime);
  const storagePath = `${input.userId}/${input.postId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, input.file, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("post_attachments")
    .insert({
      post_id: input.postId,
      comment_id: input.commentId ?? null,
      private_message_id: input.privateMessageId ?? null,
      storage_path: storagePath,
      mime_type: mime,
      visibility: input.visibility,
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    throw error;
  }

  const url = await signAttachmentUrl(supabase, storagePath);
  return mapAttachment(data, url);
}

export async function deleteAttachment(supabase: Client, attachment: PostAttachment) {
  const { error } = await supabase
    .from("post_attachments")
    .delete()
    .eq("id", attachment.id);

  if (error) throw error;

  await supabase.storage.from(ATTACHMENT_BUCKET).remove([attachment.storage_path]);
}
