import { Suspense } from "react";

import { AuthBanner } from "@/components/board/auth-banner";
import { PublicBoard } from "@/components/board/public-board";
import { PlatformLanding } from "@/components/marketing/platform-landing";
import { TENANT_QUERY_KEY } from "@/lib/projects";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawTenant = params[TENANT_QUERY_KEY];
  const tenantSlug = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;
  const hasTenant = Boolean(tenantSlug?.trim());

  if (!hasTenant) {
    return (
      <Suspense
        fallback={
          <main className="landing-canvas flex flex-1 items-center justify-center px-4 py-16">
            <div className="surface-card h-72 w-full max-w-md animate-pulse" />
          </main>
        }
      >
        <PlatformLanding />
      </Suspense>
    );
  }

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
                className="surface-card h-28 animate-pulse"
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
