"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FlaskConical } from "lucide-react";

import { GitHubIcon, GoogleIcon } from "@/components/auth/oauth-icons";
import { Button } from "@/components/ui/button";
import { formatAuthError } from "@/lib/auth-errors";
import { buildOAuthCallbackUrl } from "@/lib/auth-redirect";
import { isDevLoginUiEnabled } from "@/lib/dev-login";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SignInPanelProps = {
  className?: string;
  nextPath?: string;
  onSuccess?: () => void;
};

export function SignInPanel({
  className,
  nextPath,
  onSuccess,
}: SignInPanelProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null
  );
  const [devLoading, setDevLoading] = useState(false);
  const showDevLogin = isDevLoginUiEnabled();

  function resolveNextPath() {
    if (nextPath) return nextPath;
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname || "/";
  }

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    setOauthLoading(provider);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildOAuthCallbackUrl(resolveNextPath()),
      },
    });

    if (oauthError) {
      setOauthLoading(null);
      setError(formatAuthError(oauthError));
    }
  }

  async function handleDevLogin() {
    setError(null);
    setDevLoading(true);

    try {
      const response = await fetch("/api/dev/login", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Dev login failed");
        setDevLoading(false);
        return;
      }

      // Server set session cookies — re-read them on the browser client.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Dev login succeeded but no session was found. Try refreshing.");
        setDevLoading(false);
        return;
      }

      onSuccess?.();
      router.refresh();
      window.location.assign(resolveNextPath() || "/boards");
    } catch {
      setError("Dev login failed. Is the local API running?");
      setDevLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        className="h-10 justify-center"
        disabled={Boolean(oauthLoading) || devLoading}
        onClick={() => void handleOAuth("google")}
      >
        <GoogleIcon className="size-4" />
        {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 justify-center"
        disabled={Boolean(oauthLoading) || devLoading}
        onClick={() => void handleOAuth("github")}
      >
        <GitHubIcon className="size-4" />
        {oauthLoading === "github" ? "Redirecting…" : "Continue with GitHub"}
      </Button>

      {showDevLogin ? (
        <>
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
              <span className="bg-white px-2 text-slate-500">Local only</span>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-10 justify-center border border-dashed border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
            disabled={Boolean(oauthLoading) || devLoading}
            onClick={() => void handleDevLogin()}
          >
            <FlaskConical data-icon="inline-start" />
            {devLoading ? "Signing in…" : "Local admin login"}
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-slate-500">
            Requires local Supabase (`127.0.0.1:54321`) + seed user
            admin@feedback.local — never available in production.
          </p>
        </>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
