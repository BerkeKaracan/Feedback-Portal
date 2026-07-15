"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { POST_STATUSES, STATUS_META, type PostStatus } from "@/types/database";

type BoardToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: PostStatus | "all";
  onStatusFilterChange: (value: PostStatus | "all") => void;
  minVotes: number;
  onMinVotesChange: (value: number) => void;
  visibleCount: number;
  totalCount: number;
};

export function BoardToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  minVotes,
  onMinVotesChange,
  visibleCount,
  totalCount,
}: BoardToolbarProps) {
  return (
    <div className="space-y-3 rounded-3xl border border-white/70 bg-white/55 p-3 shadow-sm backdrop-blur-md sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter requests by title or description..."
            className="border-slate-200 bg-white pl-8"
            aria-label="Filter requests"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-slate-400" />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Min votes
            <Input
              type="number"
              min={0}
              value={minVotes}
              onChange={(event) =>
                onMinVotesChange(Math.max(0, Number(event.target.value) || 0))
              }
              className="h-8 w-20 border-slate-200 bg-white"
            />
          </label>
          <span className="text-xs text-slate-400 tabular-nums">
            {visibleCount}/{totalCount}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onStatusFilterChange("all")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          )}
        >
          All stages
        </button>
        {POST_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusFilterChange(status)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === status
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", STATUS_META[status].accent)}
            />
            {STATUS_META[status].label}
          </button>
        ))}
      </div>
    </div>
  );
}
