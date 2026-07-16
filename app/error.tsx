"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-teal-700 uppercase">
          Something went wrong
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          We hit an unexpected error
        </h1>
        <p className="text-sm text-slate-600">
          {error.message || "Please try again. If it keeps happening, refresh the page."}
        </p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
