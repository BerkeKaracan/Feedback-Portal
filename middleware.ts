import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const TENANT_QUERY_KEY = "tenant";

export async function middleware(request: NextRequest) {
  const tenantSlug =
    request.nextUrl.searchParams.get(TENANT_QUERY_KEY)?.trim().toLowerCase() ||
    "";

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set("x-feedback-tenant", tenantSlug);
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "signin-required");
      return NextResponse.redirect(url);
    }

    if (tenantSlug) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", tenantSlug)
        .maybeSingle();

      const { data: allowed } = project
        ? await supabase.rpc("is_project_admin", {
            p_project_id: project.id,
          })
        : { data: false };

      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "admin-required");
        return NextResponse.redirect(url);
      }
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "admin-required");
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
