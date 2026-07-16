"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  DEFAULT_PROJECT_FEATURES,
  TENANT_QUERY_KEY,
  fetchProjectBySlug,
  themeToCssVars,
  withTenantParam,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectFeatures } from "@/types/database";

type TenantContextValue = {
  /** Raw ?tenant= slug from the URL (may be unknown / invalid). */
  slug: string | null;
  project: Project | null;
  loading: boolean;
  error: string | null;
  features: ProjectFeatures;
  /** True when a known project is active. */
  isTenant: boolean;
  hrefWithTenant: (href: string) => string;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const slugParam = searchParams.get(TENANT_QUERY_KEY)?.trim().toLowerCase() || null;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(Boolean(slugParam));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugParam) {
      setProject(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    setLoading(true);
    setError(null);

    void fetchProjectBySlug(supabase, slugParam)
      .then((next) => {
        if (cancelled) return;
        setProject(next);
        if (!next) {
          setError(`Unknown tenant “${slugParam}”. Showing the default portal.`);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject(null);
        setError(
          err instanceof Error ? err.message : "Could not load tenant branding."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slugParam]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = new Map<string, string>();

    if (!project) {
      delete root.dataset.tenant;
      delete (
        window as Window & { __FEEDBACK_PORTAL__?: unknown }
      ).__FEEDBACK_PORTAL__;
      return;
    }

    const vars = themeToCssVars(project.theme_config);
    for (const [key, value] of Object.entries(vars)) {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, value);
    }
    root.dataset.tenant = project.slug;

    // Invisible host bridge (no UI). Workspace OS / embeds can read this.
    (
      window as Window & {
        __FEEDBACK_PORTAL__?: {
          projectId: string;
          slug: string;
          name: string;
          features: ProjectFeatures;
        };
      }
    ).__FEEDBACK_PORTAL__ = {
      projectId: project.id,
      slug: project.slug,
      name: project.name,
      features: project.custom_features,
    };

    return () => {
      for (const [key, value] of previous.entries()) {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      }
      delete root.dataset.tenant;
      delete (
        window as Window & { __FEEDBACK_PORTAL__?: unknown }
      ).__FEEDBACK_PORTAL__;
    };
  }, [project]);

  const value = useMemo<TenantContextValue>(() => {
    const features = project?.custom_features ?? DEFAULT_PROJECT_FEATURES;
    const activeSlug = project?.slug ?? null;

    return {
      slug: slugParam,
      project,
      loading,
      error,
      features,
      isTenant: Boolean(project),
      hrefWithTenant: (href: string) => withTenantParam(href, activeSlug),
    };
  }, [error, loading, project, slugParam]);

  const style = useMemo(() => {
    if (!project) return undefined;
    return themeToCssVars(project.theme_config) as CSSProperties;
  }, [project]);

  return (
    <TenantContext.Provider value={value}>
      <div
        className={project ? "tenant-shell" : undefined}
        data-tenant={project?.slug}
        style={style}
      >
        {children}
      </div>
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}

/** Safe when provider may be absent (e.g. isolated tests). */
export function useOptionalTenant() {
  return useContext(TenantContext);
}
