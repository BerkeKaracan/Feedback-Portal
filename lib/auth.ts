import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { fetchProjectBySlug, TENANT_QUERY_KEY } from "@/lib/projects";
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

export async function getRequestTenantSlug() {
  const headerStore = await headers();
  return headerStore.get("x-feedback-tenant")?.trim().toLowerCase() || null;
}

/**
 * Platform admin (profiles.is_admin) for the universal board,
 * or project admin (project_members) when ?tenant= is active.
 */
export async function requireAdmin(): Promise<Profile> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/?error=signin-required`);
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    redirect(`/?error=signin-required`);
  }

  const tenantSlug = await getRequestTenantSlug();
  const supabase = await createClient();

  if (!tenantSlug) {
    if (!profile.is_admin) {
      redirect(`/?error=admin-required`);
    }
    return profile;
  }

  const project = await fetchProjectBySlug(supabase, tenantSlug);
  if (!project) {
    redirect(`/?error=admin-required`);
  }

  const { data: allowed, error } = await supabase.rpc("is_project_admin", {
    p_project_id: project.id,
  });

  if (error || !allowed) {
    redirect(
      `/?${TENANT_QUERY_KEY}=${encodeURIComponent(tenantSlug)}&error=admin-required`
    );
  }

  return profile;
}
