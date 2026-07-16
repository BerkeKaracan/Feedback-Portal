import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Project,
  ProjectFeatures,
  ProjectThemeConfig,
} from "@/types/database";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export const TENANT_QUERY_KEY = "tenant";

export const DEFAULT_PROJECT_FEATURES: ProjectFeatures = {
  comments: true,
  duplicateDetection: true,
  submitIdeas: true,
  integrations: {},
};

function asRecord(value: Json | null | undefined): Record<string, Json | undefined> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, Json | undefined>;
  }
  return {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: Json | undefined, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function parseThemeConfig(value: Json | null | undefined): ProjectThemeConfig {
  const raw = asRecord(value);
  return {
    primary: asString(raw.primary),
    primaryForeground: asString(raw.primaryForeground),
    accent: asString(raw.accent),
    accentForeground: asString(raw.accentForeground),
    muted: asString(raw.muted),
    ring: asString(raw.ring),
  };
}

export function parseProjectFeatures(
  value: Json | null | undefined
): ProjectFeatures {
  const raw = asRecord(value);
  const integrationsRaw = asRecord(raw.integrations);

  const integrations: ProjectFeatures["integrations"] = {};
  for (const [key, entry] of Object.entries(integrationsRaw)) {
    const record = asRecord(entry);
    integrations[key] = {
      enabled: asBoolean(record.enabled, false),
      invisible: asBoolean(record.invisible, true),
      ...(typeof record.baseUrl === "string"
        ? { baseUrl: record.baseUrl }
        : {}),
    };
  }

  return {
    comments: asBoolean(raw.comments, DEFAULT_PROJECT_FEATURES.comments),
    duplicateDetection: asBoolean(
      raw.duplicateDetection,
      DEFAULT_PROJECT_FEATURES.duplicateDetection
    ),
    submitIdeas: asBoolean(
      raw.submitIdeas,
      DEFAULT_PROJECT_FEATURES.submitIdeas
    ),
    integrations,
  };
}

export function mapProjectRow(
  row: Database["public"]["Tables"]["projects"]["Row"]
): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logo_url: row.logo_url,
    theme_config: parseThemeConfig(row.theme_config),
    custom_features: parseProjectFeatures(row.custom_features),
    origin_url: row.origin_url ?? null,
    origin_host: row.origin_host ?? null,
    created_at: row.created_at,
  };
}

export async function claimProjectAccess(
  supabase: Client,
  projectId: string
): Promise<"admin" | "member"> {
  const { data, error } = await supabase.rpc("claim_project_access", {
    p_project_id: projectId,
  });
  if (error) throw error;
  if (data !== "admin" && data !== "member") {
    throw new Error("Could not claim project access");
  }
  return data;
}

export async function isProjectAdmin(
  supabase: Client,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_project_admin", {
    p_project_id: projectId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchProjectBySlug(
  supabase: Client,
  slug: string
): Promise<Project | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapProjectRow(data);
}

/** CSS custom properties applied when a tenant is active. */
export function themeToCssVars(theme: ProjectThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  if (theme.primary) vars["--tenant-primary"] = theme.primary;
  if (theme.primaryForeground) {
    vars["--tenant-primary-foreground"] = theme.primaryForeground;
  }
  if (theme.accent) vars["--tenant-accent"] = theme.accent;
  if (theme.accentForeground) {
    vars["--tenant-accent-foreground"] = theme.accentForeground;
  }
  if (theme.muted) vars["--tenant-muted"] = theme.muted;
  if (theme.ring) vars["--tenant-ring"] = theme.ring;

  // Map onto shadcn tokens so buttons/inputs pick up brand color.
  if (theme.primary) vars["--primary"] = theme.primary;
  if (theme.primaryForeground) {
    vars["--primary-foreground"] = theme.primaryForeground;
  }
  if (theme.accent) vars["--accent"] = theme.accent;
  if (theme.accentForeground) {
    vars["--accent-foreground"] = theme.accentForeground;
  }
  if (theme.muted) vars["--muted"] = theme.muted;
  if (theme.ring) vars["--ring"] = theme.ring;

  return vars;
}

export function withTenantParam(
  href: string,
  tenantSlug: string | null | undefined
) {
  if (!tenantSlug) return href;
  const url = new URL(href, "http://local.invalid");
  url.searchParams.set(TENANT_QUERY_KEY, tenantSlug);
  return `${url.pathname}${url.search}${url.hash}`;
}
