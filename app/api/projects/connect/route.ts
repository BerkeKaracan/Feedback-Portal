import { NextResponse } from "next/server";

import {
  fetchSiteMetadata,
  fetchWellKnownVerifyToken,
} from "@/lib/connect/site-metadata";
import { mapProjectRow } from "@/lib/projects";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

type ConnectBody = {
  url?: string;
  challengeId?: string;
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Sign in required",
        code: "signin-required",
      },
      { status: 401 }
    );
  }

  let body: ConnectBody;
  try {
    body = (await request.json()) as ConnectBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const challengeId = body.challengeId?.trim();
  const rawUrl = body.url?.trim();
  if (!challengeId) {
    return NextResponse.json(
      { error: "challengeId is required. Start verification first." },
      { status: 400 }
    );
  }
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const { data: challenge, error: challengeError } = await supabase
      .from("project_verify_challenges")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle();

    if (challengeError) {
      return NextResponse.json({ error: challengeError.message }, { status: 500 });
    }
    if (!challenge || challenge.user_id !== user.id) {
      return NextResponse.json(
        { error: "Verification challenge not found" },
        { status: 404 }
      );
    }
    if (challenge.consumed_at) {
      return NextResponse.json(
        { error: "Verification challenge already used" },
        { status: 400 }
      );
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Verification challenge expired. Start again." },
        { status: 400 }
      );
    }

    const publishedToken = await fetchWellKnownVerifyToken(challenge.origin_url);
    if (publishedToken !== challenge.token) {
      return NextResponse.json(
        {
          error:
            "Token mismatch. Publish the exact verification token to /.well-known/feedback-portal-verify.txt",
        },
        { status: 400 }
      );
    }

    const meta = await fetchSiteMetadata(challenge.origin_url);
    const name = body.name?.trim() || meta.name;
    const logoUrl = body.logoUrl?.trim() || meta.logoUrl;

    const { data, error } = await supabase.rpc("connect_project_verified", {
      p_challenge_id: challengeId,
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
