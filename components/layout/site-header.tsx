"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles } from "lucide-react";

import { AuthButton } from "@/components/auth/auth-button";
import { buttonVariants } from "@/components/ui/button";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const onAdmin = pathname.startsWith("/admin");
  const { isAdmin, loading: authLoading } = useAuthProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-slate-900"
        >
          <span className="flex size-7 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Sparkles className="size-3.5" />
          </span>
          Feedback Portal
        </Link>

        <nav className="flex items-center gap-1">
          {!authLoading && isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                buttonVariants({
                  variant: onAdmin ? "secondary" : "ghost",
                  size: "sm",
                }),
                onAdmin &&
                  "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
              )}
            >
              <LayoutDashboard data-icon="inline-start" />
              Admin
            </Link>
          ) : null}
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
