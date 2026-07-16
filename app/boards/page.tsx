"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, LayoutGrid, Link2, LoaderCircle, Shield } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import {
  TENANT_QUERY_KEY,
  fetchMyProjects,
  type MyProject,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function MyBoardsPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuthProfile();
  const [boards, setBoards] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setBoards([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchMyProjects(supabase)
      .then((next) => {
        if (!cancelled) setBoards(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load boards");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, supabase, user]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-teal-800 uppercase">
          <LayoutGrid className="size-3.5" />
          Your account
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          My boards
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-600">
          Boards you connect stay on your account. Close the tab anytime — open
          them again here.
        </p>
      </div>

      {!authLoading && !user ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            Sign in to see the product boards linked to your account.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Use <span className="font-medium">Sign in</span> in the header, then
            return to this page.
          </p>
        </div>
      ) : loading || authLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="size-4 animate-spin" />
          Loading your boards…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : boards.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center space-y-4">
          <p className="text-sm text-slate-600">
            No boards on this account yet. Connect a product to create one.
          </p>
          <Link
            href="/connect"
            className={cn(buttonVariants({ size: "default" }), "inline-flex")}
          >
            <Link2 data-icon="inline-start" />
            Connect your product
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {boards.map((board) => (
            <li
              key={board.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                {board.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={board.logo_url}
                    alt=""
                    className="size-10 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <LayoutGrid className="size-4" />
                  </span>
                )}
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-slate-900">
                    {board.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {board.origin_host ?? board.slug}
                    {" · "}
                    <span className="inline-flex items-center gap-1">
                      {board.role === "admin" ? (
                        <>
                          <Shield className="size-3" />
                          Admin
                        </>
                      ) : (
                        "Member"
                      )}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/?${TENANT_QUERY_KEY}=${encodeURIComponent(board.slug)}`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open board
                </Link>
                {board.role === "admin" ? (
                  <Link
                    href={`/admin?${TENANT_QUERY_KEY}=${encodeURIComponent(board.slug)}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                  >
                    Admin
                  </Link>
                ) : null}
                {board.origin_url ? (
                  <a
                    href={board.origin_url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" })
                    )}
                  >
                    <ExternalLink data-icon="inline-start" />
                    Site
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <div className="mt-8 flex justify-center">
          <Link
            href="/connect"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Link2 data-icon="inline-start" />
            Connect another product
          </Link>
        </div>
      ) : null}
    </main>
  );
}
