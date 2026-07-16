/**
 * Only allow same-app relative redirects (blocks open redirects).
 * Accepts path + query + hash, e.g. "/boards", "/?tenant=acme", "/connect".
 */
export function safeAuthNextPath(
  raw: string | null | undefined,
  fallback = "/"
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

export function buildOAuthCallbackUrl(nextPath: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const next = safeAuthNextPath(nextPath, "/");
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
