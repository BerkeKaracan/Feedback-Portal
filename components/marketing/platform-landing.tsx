"use client";

import Link from "next/link";
import {
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Sparkles,
} from "lucide-react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { buttonVariants } from "@/components/ui/button";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { isDevLoginUiEnabled } from "@/lib/dev-login";
import { cn } from "@/lib/utils";

export function PlatformLanding() {
  const { user, isAdmin, loading: authLoading } = useAuthProfile();
  const showDemoLink = isDevLoginUiEnabled();

  return (
    <main className="landing-canvas relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 landing-glow" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="animate-board-in mx-auto max-w-2xl space-y-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-semibold tracking-tight text-slate-900 shadow-sm">
            <span className="flex size-7 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Sparkles className="size-3.5" />
            </span>
            Feedback Portal
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Collect ideas. Ship what matters.
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            A focused feedback board and roadmap workspace for your product —
            upvotes, comments, and admin triage in one place.
          </p>
        </section>

        <section
          className="animate-board-in surface-card mx-auto w-full max-w-md p-6 sm:p-7"
          style={{ animationDelay: "80ms" }}
        >
          {authLoading ? (
            <div className="space-y-3" aria-hidden>
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : user ? (
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Welcome back
                </h2>
                <p className="text-sm text-slate-600">
                  Jump into your boards or connect a new product.
                </p>
              </div>
              <div className="grid gap-2">
                <Link
                  href="/boards"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 justify-center"
                  )}
                >
                  <LayoutGrid data-icon="inline-start" />
                  My boards
                </Link>
                <Link
                  href="/connect"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 justify-center"
                  )}
                >
                  <Link2 data-icon="inline-start" />
                  Connect a product
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "lg" }),
                      "h-11 justify-center"
                    )}
                  >
                    <LayoutDashboard data-icon="inline-start" />
                    Open admin
                  </Link>
                ) : null}
                {showDemoLink ? (
                  <Link
                    href="/?tenant=demo"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-11 justify-center border-dashed border-teal-300 text-teal-900 hover:bg-teal-50"
                    )}
                  >
                    <FlaskConical data-icon="inline-start" />
                    Open demo board (test)
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Sign in to get started
                </h2>
                <p className="text-sm text-slate-600">
                  Continue with Google or GitHub. Your votes and boards stay on
                  your profile.
                </p>
              </div>
              <SignInPanel nextPath="/boards" />
              {showDemoLink ? (
                <Link
                  href="/?tenant=demo"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 w-full justify-center border-dashed border-teal-300 text-teal-900 hover:bg-teal-50"
                  )}
                >
                  <FlaskConical data-icon="inline-start" />
                  Browse demo board (test)
                </Link>
              ) : null}
              <p className="text-center text-sm text-slate-500">
                Have a product domain?{" "}
                <Link
                  href="/connect"
                  className="font-medium text-teal-800 underline-offset-4 hover:underline"
                >
                  Connect it after sign-in
                </Link>
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
