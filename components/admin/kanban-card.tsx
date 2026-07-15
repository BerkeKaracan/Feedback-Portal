"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

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
        "rounded-lg border bg-card p-3 shadow-sm transition-shadow",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "rotate-1 shadow-lg ring-1 ring-border"
      )}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Drag ${post.title}`}
          {...(isOverlay ? {} : { ...listeners, ...attributes })}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-sm font-medium leading-snug tracking-tight">
            {post.title}
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {post.description}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {post.vote_count} votes · {post.author_name}
          </p>
        </div>
      </div>
    </article>
  );
}
