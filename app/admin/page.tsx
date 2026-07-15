import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { KanbanBoard } from "@/components/admin/kanban-board";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit"
          )}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to board
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Drag requests between columns to update status in local Supabase.
          Sign in first — updates require an authenticated session.
        </p>
      </div>

      <KanbanBoard />
    </main>
  );
}
