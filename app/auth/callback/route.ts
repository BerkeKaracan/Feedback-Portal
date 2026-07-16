import { NextResponse } from "next/server";

import { safeAuthNextPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeAuthNextPath(requestUrl.searchParams.get("next"), "/");
  const errorDescription =
    requestUrl.searchParams.get("error_description") ||
    requestUrl.searchParams.get("error");

  const redirectWithError = (message: string) => {
    const url = new URL("/", requestUrl.origin);
    url.searchParams.set("error", "oauth");
    url.searchParams.set("error_description", message);
    return NextResponse.redirect(url);
  };

  if (errorDescription) {
    return redirectWithError(errorDescription);
  }

  if (!code) {
    return redirectWithError("Missing OAuth authorization code.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithError(error.message);
  }

  // Prefer OAuth provider display name when profile still looks like an email local-part.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = user.user_metadata ?? {};
    const preferred =
      (typeof meta.display_name === "string" && meta.display_name.trim()) ||
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      (typeof meta.user_name === "string" && meta.user_name.trim()) ||
      "";

    if (preferred) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      const current = profile?.display_name?.trim() ?? "";
      const emailLocal = user.email?.split("@")[0] ?? "";
      const looksGenerated =
        !current ||
        current === emailLocal ||
        current === "User" ||
        current.length < 2;

      if (looksGenerated) {
        await supabase
          .from("profiles")
          .update({ display_name: preferred.slice(0, 40) })
          .eq("id", user.id);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
