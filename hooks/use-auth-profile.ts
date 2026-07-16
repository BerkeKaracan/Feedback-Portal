"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { useOptionalTenant } from "@/components/tenant/tenant-provider";
import { claimProjectAccess, isProjectAdmin } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProjectMemberRole } from "@/types/database";

export function useAuthProfile() {
  const supabase = createClient();
  const tenant = useOptionalTenant();
  const projectId = tenant?.project?.id ?? null;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projectRole, setProjectRole] = useState<ProjectMemberRole | null>(null);
  const [projectAdmin, setProjectAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser) {
        setProfile(null);
        setProjectRole(null);
        setProjectAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, is_admin, created_at")
        .eq("id", nextUser.id)
        .maybeSingle();

      setProfile(data);

      if (projectId) {
        try {
          const role = await claimProjectAccess(supabase, projectId);
          setProjectRole(role);
          const allowed =
            Boolean(data?.is_admin) ||
            role === "admin" ||
            (await isProjectAdmin(supabase, projectId));
          setProjectAdmin(allowed);
        } catch {
          setProjectRole(null);
          setProjectAdmin(Boolean(data?.is_admin));
        }
      } else {
        setProjectRole(null);
        setProjectAdmin(false);
      }

      setLoading(false);
    },
    [projectId, supabase]
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      void loadProfile(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setLoading(true);
      void loadProfile(nextUser);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, supabase.auth]);

  function refreshProfile(next: Profile | null) {
    setProfile(next);
  }

  const isPlatformAdmin = Boolean(profile?.is_admin);
  // Tenant board: project admin (self-claimed) or platform admin.
  // Universal board: platform admin only.
  const isBoardAdmin = projectId ? projectAdmin || isPlatformAdmin : isPlatformAdmin;

  return {
    user,
    profile,
    loading,
    isAdmin: isBoardAdmin,
    isPlatformAdmin,
    isBoardAdmin,
    projectRole,
    refreshProfile,
  };
}
