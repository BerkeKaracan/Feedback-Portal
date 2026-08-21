"use client";

import { useDroppable } from "@dnd-kit/core";

import { KanbanCard } from "@/components/admin/kanban-card";
import { cn } from "@/lib/utils";
import { STATUS_META, type Post, type PostStatus } from "@/types/database";

type KanbanColumnProps = {
  status: PostStatus;
  posts: Post[];
  index: number;
  onOpenPost: (post: Post) => void;
};

export function KanbanColumn({
  status,
  posts,
  index,
  onOpenPost,
}: KanbanColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <section
      className={cn(
        "animate-board-in flex w-[300px] shrink-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)] transition-all duration-200",
        isOver &&
          "border-teal-400 bg-teal-50/70 shadow-[0_0_0_1px_rgba(45,212,191,0.35)]"
      )}
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <div className="mb-3 space-y-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", meta.accent)} />
            <h2 className="text-sm font-semibold tracking-tight text-slate-950">
              {meta.label}
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
            {posts.length}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">{meta.hint}</p>
        <div className={cn("h-1 rounded-full opacity-80", meta.accent)} />
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-[420px] flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5"
      >
        {posts.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-xs text-slate-500 transition-colors",
              isOver && "border-teal-500 bg-teal-50 text-teal-800"
            )}
          >
            Drop a request into this stage
          </div>
        ) : (
          posts.map((post) => (
            <KanbanCard key={post.id} post={post} onOpen={onOpenPost} />
          ))
        )}
      </div>
    </section>
  );
}
