import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return getProfile(user.id);
}

export async function requireAdmin(): Promise<Profile> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/?error=signin-required");
  }

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) {
    redirect("/?error=admin-required");
  }

  return profile;
}
