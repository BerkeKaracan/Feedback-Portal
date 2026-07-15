"use client";

import { useDroppable } from "@dnd-kit/core";

import { KanbanCard } from "@/components/admin/kanban-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Post, type PostStatus } from "@/types/database";

type KanbanColumnProps = {
  status: PostStatus;
  posts: Post[];
};

export function KanbanColumn({ status, posts }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <section
      className={cn(
        "flex min-h-72 flex-col rounded-xl border bg-muted/30 p-3 transition-colors",
        isOver && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-medium">{STATUS_LABELS[status]}</h2>
        <Badge variant="secondary" className="tabular-nums">
          {posts.length}
        </Badge>
      </div>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2">
        {posts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-background/50 px-3 py-8 text-center text-xs text-muted-foreground">
            Drop requests here
          </div>
        ) : (
          posts.map((post) => <KanbanCard key={post.id} post={post} />)
        )}
      </div>
    </section>
  );
}
