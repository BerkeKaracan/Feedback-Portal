"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  POST_STATUSES,
  STATUS_META,
  type BoardSort,
  type PostStatus,
} from "@/types/database";

type BoardToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  sort: BoardSort;
  onSortChange: (value: BoardSort) => void;
  statusFilter: PostStatus | "all";
  onStatusFilterChange: (value: PostStatus | "all") => void;
  visibleCount: number;
  totalCount: number;
};

export function BoardToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  visibleCount,
  totalCount,
}: BoardToolbarProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm backdrop-blur-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search requests or tags..."
            className="border-slate-200 bg-white pl-8"
            aria-label="Search feature requests"
          />
        </div>

        <Select
          value={sort}
          onValueChange={(value) => {
            if (value === "top" || value === "newest") onSortChange(value);
          }}
        >
          <SelectTrigger className="w-full border-slate-200 bg-white sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="top">Top voted</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as PostStatus | "all")
          }
        >
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100/80 p-1 sm:w-fit">
            <TabsTrigger value="all" className="px-2.5">
              All
            </TabsTrigger>
            {POST_STATUSES.map((status) => (
              <TabsTrigger key={status} value={status} className="gap-1.5 px-2.5">
                <span
                  className={`size-1.5 rounded-full ${STATUS_META[status].accent}`}
                />
                {STATUS_META[status].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <p className="text-xs text-slate-400 tabular-nums sm:text-right">
          {visibleCount}/{totalCount} showing
        </p>
      </div>
    </div>
  );
}
