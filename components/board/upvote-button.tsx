"use client";

import { ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UpvoteButtonProps = {
  count: number;
  voted?: boolean;
  onToggle: () => void;
};

export function UpvoteButton({ count, voted, onToggle }: UpvoteButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      className={cn(
        "h-auto min-w-14 flex-col gap-0.5 rounded-xl px-2 py-2",
        voted &&
          "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
      )}
      aria-pressed={voted}
      aria-label={voted ? "Remove upvote" : "Upvote"}
    >
      <ChevronUp className="size-4" />
      <span className="text-sm font-semibold tabular-nums">{count}</span>
    </Button>
  );
}
