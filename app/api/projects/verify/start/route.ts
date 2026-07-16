import { NextResponse } from "next/server";

import {
  assertSafeConnectUrl,
  verifyCandidatePaths,
} from "@/lib/connect/site-metadata";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

type StartBody = {
  url?: string;
};

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`verify-start:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Try again shortly." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required", code: "signin-required" },
      { status: 401 }
    );
  }

  let body: StartBody;
  try {
    body = (await request.json()) as StartBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const parsed = assertSafeConnectUrl(rawUrl);
    const originUrl = `${parsed.protocol}//${parsed.host}`;

    const { data, error } = await supabase.rpc("start_project_verify", {
      p_origin_url: originUrl,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Could not start verification" }, { status: 500 });
    }

    const verifyUrls = verifyCandidatePaths(originUrl);

    return NextResponse.json({
      challengeId: data.id,
      token: data.token,
      originUrl: data.origin_url,
      originHost: data.origin_host,
      expiresAt: data.expires_at,
      // Prefer public/feedback-portal-verify.txt (index 0).
      verifyUrl: verifyUrls[0],
      verifyUrls,
      instructions:
        "For Next.js/Vercel: create public/feedback-portal-verify.txt with only the token, deploy, then continue. API route /api/feedback-portal-verify also works.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
