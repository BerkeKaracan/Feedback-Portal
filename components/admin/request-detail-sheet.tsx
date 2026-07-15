"use client";

import { ChevronUp } from "lucide-react";

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
};

export function RequestDetailSheet({
  post,
  open,
  onOpenChange,
  onStatusChange,
}: RequestDetailSheetProps) {
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
                  Review the request, then move it to the right stage in your
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

              {post.tags.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Tags
                  </h3>
                  <TagChips tags={post.tags} size="md" />
                </section>
              ) : null}

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
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
