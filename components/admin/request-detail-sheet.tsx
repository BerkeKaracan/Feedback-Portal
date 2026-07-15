"use client";

import { useEffect, useState } from "react";
import { ChevronUp, Trash2, X } from "lucide-react";

import { StatusBadge } from "@/components/board/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRelativeDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  POST_STATUSES,
  STATUS_META,
  type Post,
  type PostStatus,
} from "@/types/database";

type RequestDetailSheetProps = {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (postId: string, status: PostStatus) => void;
  onTagsChange: (postId: string, tags: string[]) => Promise<void> | void;
  onDelete: (postId: string) => Promise<void> | void;
};

export function RequestDetailSheet({
  post,
  open,
  onOpenChange,
  onStatusChange,
  onTagsChange,
  onDelete,
}: RequestDetailSheetProps) {
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      setTags(post.tags);
      setTagDraft("");
      setError(null);
    }
  }, [post]);

  async function persistTags(nextTags: string[]) {
    if (!post) return;
    setSavingTags(true);
    setError(null);
    try {
      await onTagsChange(post.id, nextTags);
      setTags(nextTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tags");
    } finally {
      setSavingTags(false);
    }
  }

  function handleAddTag(event: React.FormEvent) {
    event.preventDefault();
    const next = tagDraft.trim().toLowerCase();
    if (!next || tags.includes(next)) {
      setTagDraft("");
      return;
    }
    const nextTags = [...tags, next];
    setTagDraft("");
    void persistTags(nextTags);
  }

  function handleRemoveTag(tag: string) {
    void persistTags(tags.filter((item) => item !== tag));
  }

  async function handleDelete() {
    if (!post) return;
    const confirmed = window.confirm(
      `Delete “${post.title}”? This also removes votes and comments.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await onDelete(post.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-slate-200 bg-white p-0 sm:max-w-md"
      >
        {post ? (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-slate-100 px-5 py-5 text-left">
              <div className="pr-8">
                <StatusBadge status={post.status} />
                <SheetTitle className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                  {post.title}
                </SheetTitle>
                <SheetDescription className="mt-2 text-sm leading-relaxed text-slate-500">
                  Review the request, edit tags, or move it through the
                  pipeline.
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Votes
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-slate-900 tabular-nums">
                    <ChevronUp className="size-4 text-teal-600" />
                    {post.vote_count}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Author
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">
                    {post.author_name}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Created
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatShortDate(post.created_at)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatRelativeDate(post.created_at)}
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Description
                </h3>
                <p className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
                  {post.description}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.length === 0 ? (
                    <p className="text-xs text-slate-400">No tags yet.</p>
                  ) : (
                    tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        disabled={savingTags}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
                      >
                        {tag}
                        <X className="size-3" />
                      </button>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <Input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    placeholder="Add tag..."
                    className="h-8"
                    disabled={savingTags}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={savingTags || !tagDraft.trim()}
                  >
                    Add
                  </Button>
                </form>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Move to stage
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {POST_STATUSES.map((status) => {
                    const meta = STATUS_META[status];
                    const active = post.status === status;

                    return (
                      <Button
                        key={status}
                        type="button"
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "h-auto justify-start gap-2 px-3 py-2.5",
                          active && "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                        disabled={active}
                        onClick={() => onStatusChange(post.id, status)}
                      >
                        <span
                          className={cn("size-2 rounded-full", meta.accent)}
                        />
                        <span className="text-left">
                          <span className="block text-xs font-semibold">
                            {meta.label}
                          </span>
                          <span
                            className={cn(
                              "block text-[11px] font-normal",
                              active ? "text-white/70" : "text-muted-foreground"
                            )}
                          >
                            {meta.hint}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2 border-t border-slate-100 pt-4">
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  <Trash2 data-icon="inline-start" />
                  {deleting ? "Deleting..." : "Delete request"}
                </Button>
              </section>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
