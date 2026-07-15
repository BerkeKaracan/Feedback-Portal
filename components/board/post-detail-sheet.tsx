"use client";

import { useEffect, useState } from "react";
import { ChevronUp, MessageSquare, Shield, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/board/status-badge";
import { TagChips } from "@/components/board/tag-chips";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import {
  createComment,
  deleteComment,
  fetchCommentsForPost,
} from "@/lib/comments";
import { formatRelativeDate, formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Comment, Post } from "@/types/database";

type PostDetailSheetProps = {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleVote: (postId: string) => void;
};

export function PostDetailSheet({
  post,
  open,
  onOpenChange,
  onToggleVote,
}: PostDetailSheetProps) {
  const supabase = createClient();
  const { user, profile, isAdmin } = useAuthProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !post) {
      setComments([]);
      setContent("");
      setError(null);
      return;
    }

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCommentsForPost(supabase, post!.id);
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
  }, [open, post, supabase]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!post || !user) {
      setError("Sign in to leave a comment.");
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await createComment(supabase, {
        postId: post.id,
        userId: user.id,
        content: trimmed,
      });

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
        },
      ]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setError(null);
    try {
      await deleteComment(supabase, commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-slate-200 bg-white p-0 sm:max-w-lg"
      >
        {post ? (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-slate-100 px-5 py-5 text-left">
              <div className="pr-8 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={post.status} />
                  <TagChips tags={post.tags} />
                </div>
                <SheetTitle className="text-xl font-semibold tracking-tight text-slate-950">
                  {post.title}
                </SheetTitle>
                <SheetDescription className="text-sm leading-relaxed text-slate-500">
                  {post.description}
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-xs text-slate-500">
                  <p className="font-medium text-slate-700">{post.author_name}</p>
                  <p>
                    {formatShortDate(post.created_at)} ·{" "}
                    {formatRelativeDate(post.created_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={post.has_voted ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleVote(post.id)}
                  className="min-w-16 flex-col gap-0.5 py-2"
                >
                  <ChevronUp className="size-3.5" />
                  <span className="tabular-nums">{post.vote_count}</span>
                </Button>
              </section>

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
                    No comments yet. Start the thread.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {comments.map((comment) => {
                      const canDelete =
                        user?.id === comment.user_id || isAdmin;

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
                          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <form onSubmit={handleSubmit} className="space-y-2 pt-1">
                  <Textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={
                      user
                        ? "Share feedback or ask a question..."
                        : "Sign in to comment"
                    }
                    rows={3}
                    disabled={!user || submitting}
                  />
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
              </section>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
