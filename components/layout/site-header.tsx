"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, Link2, Sparkles } from "lucide-react";

import { AuthButton } from "@/components/auth/auth-button";
import { useTenant } from "@/components/tenant/tenant-provider";
import { buttonVariants } from "@/components/ui/button";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const onAdmin = pathname.startsWith("/admin");
  const onConnect = pathname.startsWith("/connect");
  const onBoards = pathname.startsWith("/boards");
  const { user, isAdmin, loading: authLoading } = useAuthProfile();
  const { project, isTenant, hrefWithTenant, error: tenantError } = useTenant();

  const brandName = isTenant ? project!.name : "Feedback Portal";
  const homeHref = hrefWithTenant("/");
  const adminHref = hrefWithTenant("/admin");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2 font-semibold tracking-tight text-slate-900"
          >
            {project?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant logos are arbitrary remote URLs
              <img
                src={project.logo_url}
                alt=""
                className="size-7 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                  isTenant ? "bg-(--tenant-primary,#0f766e)" : "bg-slate-900"
                )}
              >
                <Sparkles className="size-3.5" />
              </span>
            )}
            <span className="truncate">{brandName}</span>
          </Link>
          {tenantError ? (
            <span className="hidden truncate text-xs text-amber-700 sm:inline">
              {tenantError}
            </span>
          ) : null}
        </div>

        <nav className="flex items-center gap-1">
          {!authLoading && user ? (
            <Link
              href="/boards"
              className={cn(
                buttonVariants({
                  variant: onBoards ? "secondary" : "ghost",
                  size: "sm",
                }),
                onBoards &&
                  "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
              )}
            >
              <LayoutGrid data-icon="inline-start" />
              <span className="hidden sm:inline">My boards</span>
            </Link>
          ) : null}
          {!isTenant ? (
            <Link
              href="/connect"
              className={cn(
                buttonVariants({
                  variant: onConnect ? "secondary" : "ghost",
                  size: "sm",
                }),
                onConnect &&
                  "bg-teal-700 text-white hover:bg-teal-800 hover:text-white"
              )}
            >
              <Link2 data-icon="inline-start" />
              <span className="hidden sm:inline">Connect</span>
            </Link>
          ) : null}
          {!authLoading && isAdmin ? (
            <Link
              href={adminHref}
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
