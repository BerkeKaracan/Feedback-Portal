"use client";

import { ChevronUp } from "lucide-react";

import { CommentThread } from "@/components/board/comment-thread";
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
import { formatRelativeDate, formatShortDate } from "@/lib/format";
import type { Post } from "@/types/database";

type PostDetailSheetProps = {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleVote: (postId: string) => void;
  onCommentCountChange?: (postId: string, delta: number) => void;
};

export function PostDetailSheet({
  post,
  open,
  onOpenChange,
  onToggleVote,
  onCommentCountChange,
}: PostDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-slate-200 bg-white p-0 sm:max-w-lg"
      >
        {post ? (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-slate-100 px-5 py-5 text-left">
              <div className="space-y-3 pr-8">
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

              <CommentThread
                postId={post.id}
                open={open}
                onCountChange={(delta) =>
                  onCommentCountChange?.(post.id, delta)
                }
              />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
