import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type PostStatus } from "@/types/database";

const statusStyles: Record<PostStatus, string> = {
  idea: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  planned: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "in-progress": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-0", statusStyles[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
