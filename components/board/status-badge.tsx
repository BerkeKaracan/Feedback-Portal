import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_META, type PostStatus } from "@/types/database";

export function StatusBadge({ status }: { status: PostStatus }) {
  const meta = STATUS_META[status];

  return (
    <Badge variant="secondary" className={cn("border-0", meta.soft)}>
      <span className={cn("mr-1 size-1.5 rounded-full", meta.accent)} />
      {meta.label}
    </Badge>
  );
}
