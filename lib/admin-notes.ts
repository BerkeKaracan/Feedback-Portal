import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminNote } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function fetchAdminNotesForPost(
  supabase: Client,
  postId: string
): Promise<AdminNote[]> {
  const [{ data: notes, error: notesError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("post_admin_notes")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name"),
    ]);

  if (notesError) throw notesError;
  if (profilesError) throw profilesError;

  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name])
  );

  return (notes ?? []).map((note) => ({
    id: note.id,
    post_id: note.post_id,
    author_id: note.author_id,
    content: note.content,
    created_at: note.created_at,
    author_name: nameById.get(note.author_id) ?? `User ${note.author_id.slice(0, 8)}`,
  }));
}

export async function createAdminNote(
  supabase: Client,
  input: { postId: string; userId: string; content: string }
) {
  const { data, error } = await supabase
    .from("post_admin_notes")
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

export async function deleteAdminNote(supabase: Client, noteId: string) {
  const { error } = await supabase
    .from("post_admin_notes")
    .delete()
    .eq("id", noteId);

  if (error) throw error;
}
