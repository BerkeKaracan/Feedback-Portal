import { NextResponse } from "next/server";

import {
  assertDevLoginAllowed,
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
} from "@/lib/dev-login";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const blocked = assertDevLoginAllowed(request);
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEV_ADMIN_EMAIL,
    password: DEV_ADMIN_PASSWORD,
  });

  if (error || !data.session) {
    const detail = error?.message ?? "No session returned";
    return NextResponse.json(
      {
        error:
          `Dev login failed (${detail}). Ensure Docker is running, then: npx supabase start && npx supabase db reset. Seed user is ${DEV_ADMIN_EMAIL} / ${DEV_ADMIN_PASSWORD}.`,
        code: "auth-failed",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
