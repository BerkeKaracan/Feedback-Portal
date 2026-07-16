"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

function ConnectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError("Add ?url=https://your-product.com to connect a site.");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/projects/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = (await response.json()) as {
          redirectTo?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Connect failed");
        }
        if (!cancelled) {
          router.replace(data.redirectTo ?? "/");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Connect failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, url]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-semibold text-slate-900">Connect failed</h1>
          <p className="text-sm text-slate-600">{error}</p>
          <a href="/" className="text-sm font-medium text-teal-700 underline">
            Back to portal
          </a>
        </>
      ) : (
        <>
          <LoaderCircle className="size-6 animate-spin text-slate-500" />
          <h1 className="text-xl font-semibold text-slate-900">
            Connecting your site…
          </h1>
          <p className="text-sm text-slate-600">
            Fetching the product name and opening its feedback board.
          </p>
        </>
      )}
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-slate-500" />
        </main>
      }
    >
      <ConnectInner />
    </Suspense>
  );
}
