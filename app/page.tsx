import { Suspense } from "react";

import { AuthBanner } from "@/components/board/auth-banner";
import { PublicBoard } from "@/components/board/public-board";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <AuthBanner />
      </Suspense>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl border bg-white/50"
              />
            ))}
          </div>
        }
      >
        <PublicBoard />
      </Suspense>
    </main>
  );
}
