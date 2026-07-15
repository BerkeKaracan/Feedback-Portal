"use client";

import { useDroppable } from "@dnd-kit/core";

import { KanbanCard } from "@/components/admin/kanban-card";
import { cn } from "@/lib/utils";
import { STATUS_META, type Post, type PostStatus } from "@/types/database";

type KanbanColumnProps = {
  status: PostStatus;
  posts: Post[];
  index: number;
};

export function KanbanColumn({ status, posts, index }: KanbanColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <section
      className={cn(
        "animate-board-in flex w-[300px] shrink-0 flex-col rounded-3xl border border-white/70 bg-white/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md transition-all duration-200",
        isOver && "border-teal-300/80 bg-teal-50/50 shadow-[0_0_0_1px_rgba(45,212,191,0.25)]"
      )}
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <div className="mb-3 space-y-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", meta.accent)} />
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              {meta.label}
            </h2>
          </div>
          <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
            {posts.length}
          </span>
        </div>
        <p className="text-xs text-slate-500">{meta.hint}</p>
        <div className={cn("h-1 rounded-full", meta.accent, "opacity-70")} />
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-[420px] flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5"
      >
        {posts.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white/40 px-4 py-10 text-center text-xs text-slate-400 transition-colors",
              isOver && "border-teal-400 bg-teal-50/60 text-teal-700"
            )}
          >
            Drop a request into this stage
          </div>
        ) : (
          posts.map((post) => <KanbanCard key={post.id} post={post} />)
        )}
      </div>
    </section>
  );
}
