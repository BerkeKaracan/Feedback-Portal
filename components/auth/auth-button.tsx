"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { formatAuthError } from "@/lib/auth-errors";
import { buildOAuthCallbackUrl } from "@/lib/auth-redirect";
import { updateDisplayName } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.7.5-2.2 1.7C5.3 19.1 8.4 21 12 21c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-5.9-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.7 7.5C3.3 8.6 3 9.8 3 11s.3 2.4.7 3.5c0 .1 2.9-2.2 2.9-2.2-.2-.5-.3-1.1-.3-1.3s.1-.8.3-1.3L3.7 7.5z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.5c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.5 14.7 1.5 12 1.5 8.4 1.5 5.3 3.4 3.7 6.5l2.9 2.2C7 6.4 9.2 5.5 12 5.5z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.7.5.6 5.6.6 11.9c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.7 1.6 2.7 1.2.1-.8.4-1.3.7-1.6-2.5-.3-5.2-1.3-5.2-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.3.8 1 .8 2.1v3.1c0 .3.2.6.8.5 4.5-1.5 7.8-5.8 7.8-10.8C23.4 5.6 18.3.5 12 .5z" />
    </svg>
  );
}

export function AuthButton() {
  const supabase = createClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    user,
    profile,
    loading: authLoading,
    refreshProfile,
    isAdmin,
  } = useAuthProfile();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null
  );

  function currentNextPath() {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname || "/";
  }

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    setNotice(null);
    setOauthLoading(provider);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildOAuthCallbackUrl(currentNextPath()),
      },
    });

    if (oauthError) {
      setOauthLoading(null);
      setError(formatAuthError(oauthError));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    if (mode === "signin") {
      const result = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);

      if (result.error) {
        setError(formatAuthError(result.error));
        return;
      }

      setOpen(false);
      setEmail("");
      setPassword("");
      return;
    }

    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: email.split("@")[0] || "User",
        },
        emailRedirectTo: buildOAuthCallbackUrl(currentNextPath()),
      },
    });

    setLoading(false);

    if (result.error) {
      setError(formatAuthError(result.error));
      return;
    }

    // When email confirmation is on, Supabase returns a user but no session.
    if (!result.data.session) {
      setMode("signin");
      setPassword("");
      setNotice(
        "Account created. Check your email to confirm, then sign in. Or use Google / GitHub."
      );
      return;
    }

    setOpen(false);
    setEmail("");
    setPassword("");
  }

  async function handleProfileSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const next = await updateDisplayName(supabase, user.id, displayName);
      refreshProfile(next);
      setProfileOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update name");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (authLoading) {
    return (
      <div
        className="h-8 w-24 animate-pulse rounded-lg bg-slate-100"
        aria-hidden
      />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-1">
        <Dialog
          open={profileOpen}
          onOpenChange={(next) => {
            setProfileOpen(next);
            setError(null);
            if (next) setDisplayName(profile?.display_name ?? "");
          }}
        >
          <DialogTrigger
            render={<Button variant="ghost" size="sm" className="max-w-44" />}
          >
            <UserRound data-icon="inline-start" />
            <span className="truncate">
              {profile?.display_name ?? user.email}
              {isAdmin ? " · Admin" : ""}
            </span>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleProfileSave}>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                  Update how your name appears on requests and comments.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5 py-4">
                <label htmlFor="display-name" className="text-sm font-medium">
                  Display name
                </label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={40}
                  required
                />
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
              </div>
              <DialogFooter showCloseButton={false}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut data-icon="inline-start" />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setNotice(null);
          setOauthLoading(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <LogIn data-icon="inline-start" />
        Sign in
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "signin" ? "Sign in" : "Create account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signin"
              ? "Use Google, GitHub, or email. Votes and comments stay on your profile."
              : "Create an account to vote, comment, and connect a product board."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-center"
            disabled={Boolean(oauthLoading) || loading}
            onClick={() => void handleOAuth("google")}
          >
            <GoogleIcon className="size-4" />
            {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-center"
            disabled={Boolean(oauthLoading) || loading}
            onClick={() => void handleOAuth("github")}
          >
            <GitHubIcon className="size-4" />
            {oauthLoading === "github" ? "Redirecting…" : "Continue with GitHub"}
          </Button>
        </div>

        <div className="relative py-1 text-center text-xs text-slate-400">
          <span className="bg-background relative z-10 px-2">or email</span>
          <div className="absolute inset-x-0 top-1/2 border-t border-slate-200" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            {notice ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
            >
              {mode === "signin" ? "Need an account?" : "Have an account?"}
            </Button>
            <Button type="submit" disabled={loading || Boolean(oauthLoading)}>
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in"
                  : "Sign up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
