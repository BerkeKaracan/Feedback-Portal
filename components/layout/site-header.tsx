import Link from "next/link";
import { LayoutDashboard, Sparkles } from "lucide-react";

import { AuthButton } from "@/components/auth/auth-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-medium tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-3.5" />
          </span>
          Feedback Portal
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <LayoutDashboard data-icon="inline-start" />
            Admin
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
