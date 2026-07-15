import { Suspense } from "react";

import { AuthBanner } from "@/components/board/auth-banner";
import { PublicBoard } from "@/components/board/public-board";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <AuthBanner />
      </Suspense>
      <PublicBoard />
    </main>
  );
}
