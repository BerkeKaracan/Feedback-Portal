"use client";

import { useDraggable } from "@dnd-kit/core";
import { ChevronUp, GripVertical } from "lucide-react";

import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/database";

type KanbanCardProps = {
  post: Post;
  isOverlay?: boolean;
};

export function KanbanCard({ post, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    data: { status: post.status, post },
    disabled: isOverlay,
  });

  return (
    <article
      ref={isOverlay ? undefined : setNodeRef}
      className={cn(
        "group rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "scale-[1.02] rotate-1 border-teal-300 shadow-xl ring-1 ring-teal-200"
      )}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            className="cursor-grab touch-none rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
            aria-label={`Drag ${post.title}`}
            {...(isOverlay ? {} : { ...listeners, ...attributes })}
          >
            <GripVertical className="size-4" />
          </button>
          <div className="flex min-w-10 flex-col items-center rounded-xl bg-slate-50 px-1.5 py-1.5 text-slate-700">
            <ChevronUp className="size-3.5 text-teal-600" />
            <span className="text-sm font-semibold tabular-nums">
              {post.vote_count}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm font-semibold leading-snug tracking-tight text-slate-900">
            {post.title}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
            {post.description}
          </p>
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="truncate">{post.author_name}</span>
            <span className="shrink-0 tabular-nums">
              {formatRelativeDate(post.created_at)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
