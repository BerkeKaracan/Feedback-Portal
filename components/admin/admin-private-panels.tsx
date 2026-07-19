"use client";

import { useEffect, useState } from "react";
import { Lock, Trash2 } from "lucide-react";

import { AttachmentGallery } from "@/components/board/attachment-gallery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminNote,
  deleteAdminNote,
  fetchAdminNotesForPost,
} from "@/lib/admin-notes";
import { formatRelativeDate } from "@/lib/format";
import { fetchPrivateMessagesForPost } from "@/lib/private-messages";
import { formatActionError } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/client";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import type { AdminNote, PrivateMessage } from "@/types/database";

type AdminPrivatePanelsProps = {
  postId: string;
  open: boolean;
};

export function AdminPrivatePanels({ postId, open }: AdminPrivatePanelsProps) {
  const supabase = createClient();
  const { user, profile } = useAuthProfile();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setNotes([]);
      setNoteDraft("");
      setError(null);
      return;
    }

    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [nextMessages, nextNotes] = await Promise.all([
          fetchPrivateMessagesForPost(supabase, postId),
          fetchAdminNotesForPost(supabase, postId),
        ]);
        if (!mounted) return;
        setMessages(nextMessages);
        setNotes(nextNotes);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load private data"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [open, postId, supabase]);

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const created = await createAdminNote(supabase, {
        postId,
        userId: user.id,
        content: trimmed,
      });
      setNotes((prev) => [
        {
          id: created.id,
          post_id: created.post_id,
          author_id: created.author_id,
          content: created.content,
          created_at: created.created_at,
          author_name: profile?.display_name ?? "You",
        },
        ...prev,
      ]);
      setNoteDraft("");
    } catch (err) {
      setError(formatActionError(err, "Could not save note"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    setError(null);
    try {
      await deleteAdminNote(supabase, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete note");
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-amber-900 uppercase">
          <Lock className="size-3.5" />
          Private from user
        </div>
        <p className="text-xs text-amber-900/70">
          Only admins can see these messages. Never shown on the public board.
        </p>
        {loading ? (
          <p className="text-xs text-amber-800/70">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-amber-800/60">No private messages.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => (
              <li
                key={message.id}
                className="rounded-xl border border-amber-200/80 bg-white px-3 py-2.5"
              >
                <p className="text-xs font-medium text-slate-800">
                  {message.author_name}
                  <span className="ml-1 font-normal text-slate-400">
                    · {formatRelativeDate(message.created_at)}
                  </span>
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700">
                  {message.content}
                </p>
                {message.attachments.length > 0 ? (
                  <AttachmentGallery
                    attachments={message.attachments}
                    size="sm"
                    className="mt-2"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-600 uppercase">
          <Lock className="size-3.5" />
          Internal notes
        </div>
        <p className="text-xs text-slate-500">
          Team-only notes. Users never see this thread.
        </p>

        <form onSubmit={(event) => void handleAddNote(event)} className="space-y-2">
          <Textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add an internal note…"
            rows={3}
            maxLength={4000}
            disabled={saving}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={saving || !noteDraft.trim()}
            >
              {saving ? "Saving…" : "Add note"}
            </Button>
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="text-xs text-slate-400">No internal notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-800">
                    {note.author_name}
                    <span className="ml-1 font-normal text-slate-400">
                      · {formatRelativeDate(note.created_at)}
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void handleDeleteNote(note.id)}
                    aria-label="Delete note"
                  >
                    <Trash2 className="size-3.5 text-slate-400" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap text-slate-700">
                  {note.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
