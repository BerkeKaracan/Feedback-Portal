import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { KanbanBoard } from "@/components/admin/kanban-board";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  return (
    <main className="admin-canvas relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 admin-grid opacity-30" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="animate-board-in flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "-ml-2 w-fit text-slate-700"
              )}
            >
              <ArrowLeft data-icon="inline-start" />
              Back to home
            </Link>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
                <Sparkles className="size-3.5" />
                Roadmap workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Shape what ships next
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-700">
                Triage community demand across the pipeline. Drag requests to
                update status — this board is the control surface for your
                product decisions.
              </p>
            </div>
          </div>

          <div className="surface-card max-w-xs px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Operator tip</p>
            <p className="mt-1 leading-relaxed">
              Sign in before moving cards. Higher vote counts rise to the top of
              each stage automatically.
            </p>
          </div>
        </header>

        <KanbanBoard />
      </div>
    </main>
  );
}
