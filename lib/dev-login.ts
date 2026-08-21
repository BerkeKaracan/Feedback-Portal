/**
 * Local-only seed login helpers. Production builds never expose this path.
 */

export const DEV_ADMIN_EMAIL = "admin@feedback.local";
export const DEV_ADMIN_PASSWORD = "password123";

export function isDevLoginUiEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isLocalSupabaseUrl(url = process.env.NEXT_PUBLIC_SUPABASE_URL): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

export function assertDevLoginAllowed(request: Request): Response | null {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (process.env.ALLOW_DEV_LOGIN === "0") {
    return Response.json(
      { error: "Dev login disabled (ALLOW_DEV_LOGIN=0)." },
      { status: 403 }
    );
  }

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  if (!isLocalHost) {
    return Response.json(
      { error: "Dev login is only available on localhost." },
      { status: 403 }
    );
  }

  if (!isLocalSupabaseUrl()) {
    return Response.json(
      {
        error:
          "Local admin login needs local Supabase. Your NEXT_PUBLIC_SUPABASE_URL points at a remote project (seed users like admin@feedback.local do not exist there). Start Docker Desktop, run `npx supabase start` then `npx supabase db reset`, and set NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 with the local anon JWT from `npx supabase status`.",
        code: "remote-supabase",
      },
      { status: 400 }
    );
  }

  return null;
}
