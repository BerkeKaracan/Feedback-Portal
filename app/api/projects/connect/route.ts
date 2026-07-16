import { NextResponse } from "next/server";

import { fetchSiteMetadata } from "@/lib/connect/site-metadata";
import { mapProjectRow } from "@/lib/projects";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

type ConnectBody = {
  url?: string;
  name?: string;
  logoUrl?: string;
  themeConfig?: Record<string, string>;
};

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`connect:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many connect attempts. Try again shortly." },
      { status: 429 }
    );
  }

  let body: ConnectBody;
  try {
    body = (await request.json()) as ConnectBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const meta = await fetchSiteMetadata(rawUrl);
    const name = body.name?.trim() || meta.name;
    const logoUrl = body.logoUrl?.trim() || meta.logoUrl;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("connect_project", {
      p_origin_url: meta.originUrl,
      p_name: name,
      p_slug: meta.slug,
      p_logo_url: logoUrl,
      p_theme_config: body.themeConfig ?? {},
      p_custom_features: null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Connect failed" }, { status: 500 });
    }

    const project = mapProjectRow(data);
    return NextResponse.json({
      project,
      redirectTo: `/?tenant=${encodeURIComponent(project.slug)}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not connect site";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
