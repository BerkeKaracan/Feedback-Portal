"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  "signin-required": "Sign in to access the admin workspace.",
  "admin-required": "Admin access is required for that page.",
};

export function AuthBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) {
      setMessage(null);
      return;
    }

    setMessage(MESSAGES[code] ?? "You do not have access to that page.");

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    router.replace(url.pathname + url.search);
  }, [router, searchParams]);

  if (!message) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {message}
      </p>
    </div>
  );
}
