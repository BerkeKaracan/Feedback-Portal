import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-teal-700 uppercase">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Page not found
        </h1>
        <p className="text-sm text-slate-600">
          That route does not exist. Head back to the public roadmap.
        </p>
        <Link href="/" className={cn(buttonVariants())}>
          Back to board
        </Link>
      </div>
    </main>
  );
}
