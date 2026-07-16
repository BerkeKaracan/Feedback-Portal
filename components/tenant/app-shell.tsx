"use client";

import { Suspense, type ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { TenantProvider } from "@/components/tenant/tenant-provider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <>
          <header className="sticky top-0 z-40 h-14 border-b border-slate-200/80 bg-white/75" />
          {children}
        </>
      }
    >
      <TenantProvider>
        <SiteHeader />
        {children}
      </TenantProvider>
    </Suspense>
  );
}
