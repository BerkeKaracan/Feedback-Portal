import { cn } from "@/lib/utils";

type TagChipsProps = {
  tags: string[];
  className?: string;
  size?: "sm" | "md";
};

export function TagChips({ tags, className, size = "sm" }: TagChipsProps) {
  if (!tags.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
            size === "sm" && "px-2 py-0.5 text-[11px]",
            size === "md" && "px-2.5 py-1 text-xs"
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
