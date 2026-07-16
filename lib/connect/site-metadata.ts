const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIp(hostname: string) {
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  return false;
}

export function assertSafeConnectUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }

  const host = url.hostname.toLowerCase();
  const isLocalDev = host === "localhost" || host === "127.0.0.1";
  if (!isLocalDev && (BLOCKED_HOSTS.has(host) || isPrivateIp(host))) {
    throw new Error("That host cannot be used for connect");
  }

  return url;
}

export function slugFromHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const labels = host.split(".").filter(Boolean);

  // app.workspace-os.com → workspace-os ; workspace-os.com → workspace-os
  let base =
    labels.length >= 2 ? labels[labels.length - 2] : labels[0] ?? "project";

  // Keep multi-part product brands when subdomain is the product name.
  if (labels.length >= 3 && labels[0] && labels[0] !== "www" && labels[0] !== "app") {
    base = labels[0];
  }

  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug.length >= 2 ? slug : "project";
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function metaContent(html: string, property: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

export type SiteMetadata = {
  name: string;
  logoUrl: string | null;
  originUrl: string;
  host: string;
  slug: string;
};

/** Paths we accept for ownership proof (Next.js/Vercel-friendly first). */
export function verifyCandidatePaths(originUrl: string) {
  const url = assertSafeConnectUrl(originUrl);
  const origin = `${url.protocol}//${url.host}`;
  // Prefer public/ file (Next.js/Vercel), then API route, then well-known.
  return [
    `${origin}/feedback-portal-verify.txt`,
    `${origin}/api/feedback-portal-verify`,
    `${origin}/.well-known/feedback-portal-verify.txt`,
  ];
}

function extractVerifyToken(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return null;

  // Plain text token
  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? "";
  if (firstLine.startsWith("fp_verify_")) return firstLine.split(/\s+/)[0] ?? null;

  // JSON: { "token": "fp_verify_..." }
  try {
    const parsed = JSON.parse(trimmed) as { token?: unknown };
    if (typeof parsed.token === "string" && parsed.token.startsWith("fp_verify_")) {
      return parsed.token.trim();
    }
  } catch {
    // not JSON
  }

  return null;
}

export async function fetchWellKnownVerifyToken(
  originUrl: string
): Promise<string> {
  const candidates = verifyCandidatePaths(originUrl);
  const errors: string[] = [];

  for (const verifyUrl of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(verifyUrl, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/plain,application/json,*/*",
          "User-Agent": "FeedbackPortalConnect/1.0",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        errors.push(`${verifyUrl} → ${response.status}`);
        continue;
      }

      const token = extractVerifyToken(await response.text());
      if (!token) {
        errors.push(`${verifyUrl} → invalid body`);
        continue;
      }

      return token;
    } catch (error) {
      const message = error instanceof Error ? error.message : "fetch failed";
      errors.push(`${verifyUrl} → ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(
    `Verification endpoint not found. For Next.js put the token in public/feedback-portal-verify.txt or expose /api/feedback-portal-verify. Tried: ${errors.join("; ")}`
  );
}

export async function fetchSiteMetadata(rawUrl: string): Promise<SiteMetadata> {
  const url = assertSafeConnectUrl(rawUrl);
  const originUrl = `${url.protocol}//${url.host}`;
  const host = url.hostname.toLowerCase();
  const slug = slugFromHost(host);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(originUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "FeedbackPortalConnect/1.0",
      },
    });

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const ogTitle = metaContent(html, "og:title");
    const siteName = metaContent(html, "og:site_name") || metaContent(html, "application-name");
    const ogImage = metaContent(html, "og:image");

    const name =
      siteName ||
      ogTitle ||
      (titleMatch?.[1] ? decodeEntities(titleMatch[1].trim()) : null) ||
      host;

    let logoUrl: string | null = null;
    if (ogImage) {
      try {
        logoUrl = new URL(ogImage, originUrl).toString();
      } catch {
        logoUrl = null;
      }
    }

    return {
      name: name.slice(0, 80),
      logoUrl,
      originUrl,
      host,
      slug,
    };
  } finally {
    clearTimeout(timer);
  }
}
