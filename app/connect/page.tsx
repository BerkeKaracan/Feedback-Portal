"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Link2,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { cn } from "@/lib/utils";

type Challenge = {
  challengeId: string;
  token: string;
  verifyUrl: string;
  verifyUrls?: string[];
  originUrl: string;
  originHost: string;
  expiresAt: string;
  instructions?: string;
};

type Step = "url" | "verify" | "done";

async function startVerify(url: string): Promise<Challenge> {
  const response = await fetch("/api/projects/verify/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await response.json()) as Challenge & {
    error?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Could not start verification");
  }
  return data;
}

async function finishConnect(url: string, challengeId: string) {
  const response = await fetch("/api/projects/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, challengeId }),
  });
  const data = (await response.json()) as {
    redirectTo?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Connect failed");
  }
  return data;
}

function ConnectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetUrl = searchParams.get("url")?.trim() ?? "";
  const { user, loading: authLoading } = useAuthProfile();

  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState(presetUrl);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (presetUrl) setUrl(presetUrl);
  }, [presetUrl]);

  async function handleStart(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;

    if (!user) {
      setError("Sign in first — boards are linked to your account.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const next = await startVerify(trimmed);
      setChallenge(next);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyConnect() {
    if (!challenge || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await finishConnect(challenge.originUrl, challenge.challengeId);
      setStep("done");
      router.push(data.redirectTo ?? "/boards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!challenge) return;
    await navigator.clipboard.writeText(challenge.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.12),_transparent_55%),linear-gradient(to_bottom,#f8fafc,#ffffff)]" />

      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-medium tracking-wide text-teal-800 uppercase">
            <Link2 className="size-3.5" />
            Connect product
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Connect your site
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
            Sign in, prove you control the site with a verification file, then we
            attach a branded board to your account. The first verified connector
            becomes admin.
          </p>
        </div>

        {!authLoading && !user ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sign in from the header first. Without an account the board cannot be
            saved or administered.
          </div>
        ) : null}

        {step === "url" ? (
          <form
            onSubmit={handleStart}
            className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6"
          >
            <div className="grid gap-1.5">
              <label htmlFor="product-url" className="text-sm font-medium text-slate-800">
                Product URL
              </label>
              <Input
                id="product-url"
                type="url"
                inputMode="url"
                placeholder="https://your-product.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={loading || authLoading}
                required
                className="h-11"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading || authLoading || !url.trim() || !user}
              className="h-11 w-full"
            >
              {loading ? (
                <>
                  <LoaderCircle data-icon="inline-start" className="animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  Continue to ownership check
                  <ArrowRight data-icon="inline-end" />
                </>
              )}
            </Button>
          </form>
        ) : null}

        {step === "verify" && challenge ? (
          <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                Prove ownership of {challenge.originHost}
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                Next.js/Vercel is not a static HTML host by default — put the
                token in <code className="rounded bg-slate-100 px-1">public/</code>{" "}
                (or an API route), deploy, then verify. Expires in 30 minutes.
              </p>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs text-teal-950">
              <p className="font-medium">Next.js steps</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-teal-900/90">
                <li>
                  Create{" "}
                  <code className="rounded bg-white/80 px-1">
                    public/feedback-portal-verify.txt
                  </code>
                </li>
                <li>Paste only the token below (one line)</li>
                <li>Deploy to Vercel, open the URL (must not 404)</li>
                <li>Click Verify &amp; connect</li>
              </ol>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                Accepted URLs (any one)
              </p>
              <ul className="mt-1 space-y-1">
                {(challenge.verifyUrls ?? [challenge.verifyUrl]).map((item) => (
                  <li key={item}>
                    <code className="block break-all text-xs text-slate-800">
                      {item}
                    </code>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                  Token
                </p>
                <Button type="button" variant="ghost" size="xs" onClick={() => void copyToken()}>
                  <Copy data-icon="inline-start" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <code className="mt-1 block break-all text-xs text-slate-800">
                {challenge.token}
              </code>
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                disabled={loading}
                onClick={() => {
                  setStep("url");
                  setChallenge(null);
                  setError(null);
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                className="h-11 flex-1"
                disabled={loading}
                onClick={() => void handleVerifyConnect()}
              >
                {loading ? (
                  <>
                    <LoaderCircle data-icon="inline-start" className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <CheckCircle2 data-icon="inline-start" />
                    Verify & connect
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        <ol className="mt-8 space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              1
            </span>
            Sign in (required — no anonymous connect).
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              2
            </span>
            Publish the verification token on your domain.
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              3
            </span>
            First verified connector becomes admin; reopen anytime from{" "}
            <Link href="/boards" className="font-medium text-teal-700 underline">
              My boards
            </Link>
            .
          </li>
        </ol>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already connected?{" "}
          <Link
            href="/boards"
            className={cn(
              buttonVariants({ variant: "link" }),
              "h-auto p-0 font-medium text-teal-700"
            )}
          >
            Open My boards
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <Sparkles className="size-5 text-slate-400" />
          <LoaderCircle className="size-6 animate-spin text-slate-500" />
        </main>
      }
    >
      <ConnectInner />
    </Suspense>
  );
}
