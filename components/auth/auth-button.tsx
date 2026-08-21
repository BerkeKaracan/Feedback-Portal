"use client";

import { useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
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
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  async function handleProfileSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setProfileSaving(true);
    setError(null);

    try {
      const next = await updateDisplayName(supabase, user.id, displayName);
      refreshProfile(next);
      setProfileOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update name");
    } finally {
      setProfileSaving(false);
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
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut data-icon="inline-start" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <LogIn data-icon="inline-start" />
        Sign in
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Continue with Google or GitHub. Votes and comments stay on your
            profile.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <SignInPanel onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
