"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Menu,
  Sparkles,
} from "lucide-react";

import { AuthButton } from "@/components/auth/auth-button";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
  activeClass: string;
};

export function SiteHeader() {
  const pathname = usePathname();
  const onAdmin = pathname.startsWith("/admin");
  const onConnect = pathname.startsWith("/connect");
  const onBoards = pathname.startsWith("/boards");
  const onHome = pathname === "/";
  const { user, isAdmin, loading: authLoading } = useAuthProfile();
  const { project, isTenant, hrefWithTenant, error: tenantError } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);

  const brandName = isTenant ? project!.name : "Feedback Portal";
  const homeHref = hrefWithTenant("/");
  const adminHref = hrefWithTenant("/admin");

  const navItems: NavItem[] = [];

  if (!isTenant) {
    navItems.push({
      href: "/",
      label: "Home",
      icon: Sparkles,
      active: onHome,
      activeClass:
        "bg-slate-900 text-white hover:bg-slate-800 hover:text-white",
    });
  }

  if (!authLoading && user) {
    navItems.push({
      href: "/boards",
      label: "My boards",
      icon: LayoutGrid,
      active: onBoards,
      activeClass:
        "bg-slate-900 text-white hover:bg-slate-800 hover:text-white",
    });
  }

  if (!isTenant) {
    navItems.push({
      href: "/connect",
      label: "Connect",
      icon: Link2,
      active: onConnect,
      activeClass:
        "bg-teal-800 text-white hover:bg-teal-900 hover:text-white",
    });
  }

  if (!authLoading && isAdmin) {
    navItems.push({
      href: adminHref,
      label: "Admin",
      icon: LayoutDashboard,
      active: onAdmin,
      activeClass:
        "bg-slate-900 text-white hover:bg-slate-800 hover:text-white",
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
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
            <span className="hidden truncate text-xs text-amber-800 sm:inline">
              {tenantError}
            </span>
          ) : null}
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                buttonVariants({
                  variant: item.active ? "secondary" : "ghost",
                  size: "sm",
                }),
                item.active && item.activeClass
              )}
            >
              <item.icon data-icon="inline-start" />
              {item.label}
            </Link>
          ))}
          <AuthButton />
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <AuthButton />
          {navItems.length > 0 ? (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <Menu className="size-4" />
                <span className="sr-only">Open menu</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] gap-0 p-0">
                <SheetHeader className="border-b border-slate-200 px-4 py-4">
                  <SheetTitle>{brandName}</SheetTitle>
                  <SheetDescription>Navigate the portal</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-1 p-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        buttonVariants({
                          variant: item.active ? "secondary" : "ghost",
                          size: "default",
                        }),
                        "justify-start",
                        item.active && item.activeClass
                      )}
                    >
                      <item.icon data-icon="inline-start" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
    </header>
  );
}
