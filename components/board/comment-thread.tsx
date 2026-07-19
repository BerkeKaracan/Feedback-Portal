"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Shield, Trash2 } from "lucide-react";

import { AttachmentGallery } from "@/components/board/attachment-gallery";
import { ImageFilePicker } from "@/components/board/image-file-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { uploadPostAttachment } from "@/lib/attachments";
import {
  createComment,
  deleteComment,
  fetchCommentsForPost,
} from "@/lib/comments";
import { formatRelativeDate } from "@/lib/format";
import { formatActionError } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Comment, PostAttachment } from "@/types/database";

type CommentThreadProps = {
  postId: string;
  open: boolean;
  onCountChange?: (delta: number) => void;
  allowCompose?: boolean;
};

export function CommentThread({
  postId,
  open,
  onCountChange,
  allowCompose = true,
}: CommentThreadProps) {
  const supabase = createClient();
  const { user, profile, isAdmin } = useAuthProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setComments([]);
      setContent("");
      setImageFiles([]);
      setError(null);
      return;
    }

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCommentsForPost(supabase, postId);
        if (mounted) setComments(data);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load comments");
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      setError("Sign in to leave a comment.");
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await createComment(supabase, {
        postId,
        userId: user.id,
        content: trimmed,
      });

      const attachments: PostAttachment[] = [];
      for (const file of imageFiles) {
        attachments.push(
          await uploadPostAttachment(supabase, {
            postId,
            userId: user.id,
            file,
            visibility: "public",
            commentId: created.id,
          })
        );
      }

      setComments((prev) => [
        ...prev,
        {
          id: created.id,
          post_id: created.post_id,
          user_id: created.user_id,
          content: created.content,
          created_at: created.created_at,
          author_name: profile?.display_name ?? "You",
          is_admin: Boolean(profile?.is_admin),
          attachments,
        },
      ]);
      onCountChange?.(1);
      setContent("");
      setImageFiles([]);
    } catch (err) {
      setError(formatActionError(err, "Failed to post comment"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setError(null);
    try {
      await deleteComment(supabase, commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      onCountChange?.(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
        <MessageSquare className="size-3.5" />
        Comments
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 tabular-nums normal-case">
          {comments.length}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
          No comments yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => {
            const canDelete = user?.id === comment.user_id || isAdmin;

            return (
              <li
                key={comment.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  comment.is_admin
                    ? "border-teal-200 bg-teal-50/70"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      {comment.author_name}
                      {comment.is_admin ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                          <Shield className="size-2.5" />
                          Admin
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatRelativeDate(comment.created_at)}
                    </p>
                  </div>
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void handleDelete(comment.id)}
                      aria-label="Delete comment"
                    >
                      <Trash2 className="size-3.5 text-slate-400" />
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                  {comment.content}
                </p>
                {comment.attachments && comment.attachments.length > 0 ? (
                  <AttachmentGallery
                    attachments={comment.attachments}
                    size="sm"
                    className="mt-2"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {allowCompose ? (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2 pt-1">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={
              user ? "Share feedback or ask a question..." : "Sign in to comment"
            }
            rows={3}
            disabled={!user || submitting}
          />
          {user ? (
            <ImageFilePicker
              files={imageFiles}
              onChange={setImageFiles}
              maxFiles={1}
              label="Image"
              hint="Optional — one image per comment."
              disabled={submitting}
            />
          ) : null}
          <div className="flex items-center justify-between gap-2">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!user || submitting || !content.trim()}
            >
              {submitting ? "Posting..." : "Post comment"}
            </Button>
          </div>
        </form>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </section>
  );
}
