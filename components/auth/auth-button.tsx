"use client";

import { useState } from "react";
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
import { updateDisplayName } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
  const supabase = createClient();
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
        "Account created. If sign-in fails with “email not confirmed”, confirmation is still enabled on the Auth project — disable it for MVP, then sign in."
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
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <LogIn data-icon="inline-start" />
        Sign in
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "signin" ? "Sign in" : "Create account"}
            </DialogTitle>
            <DialogDescription>
              {mode === "signin"
                ? "Sign in with your account. Votes and comments are saved to your profile."
                : "Create an account to vote, comment, and connect a product board."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
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
            <Button type="submit" disabled={loading}>
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
