/**
 * Only allow same-app relative redirects (blocks open redirects).
 * Accepts path + query + hash, e.g. "/boards", "/?tenant=acme", "/connect".
 */
export function safeAuthNextPath(
  raw: string | null | undefined,
  fallback = "/",
) {
  if (!raw) return fallback;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return fallback;
  }
  if (decoded.includes("://") || decoded.includes("\\")) {
    return fallback;
  }

  return decoded;
}

/**
 * Prefer NEXT_PUBLIC_SITE_URL so production OAuth never falls back to a
 * misconfigured Supabase Site URL (e.g. localhost) when the allow-list is wrong.
 * Browser origin is used only when the env is unset (local dev).
 */
export function getAppOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function buildOAuthCallbackUrl(nextPath: string) {
  const origin = getAppOrigin();
  const next = safeAuthNextPath(nextPath, "/");
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
