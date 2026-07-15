"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnalyzeIdeaResponse } from "@/lib/ai/types";

type SubmitIdeaDialogProps = {
  onSubmit: (title: string, description: string) => void;
};

export function SubmitIdeaDialog({ onSubmit }: SubmitIdeaDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeIdeaResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 4 || trimmedDescription.length < 8) {
      setAnalysis(null);
      setAnalyzeError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAnalyzing(true);
      setAnalyzeError(null);

      try {
        const response = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            description: trimmedDescription,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Analysis failed");
        }

        const data = (await response.json()) as AnalyzeIdeaResponse;
        setAnalysis(data);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setAnalysis(null);
        setAnalyzeError("Could not analyze this idea right now.");
      } finally {
        setAnalyzing(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [description, open, title]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;

    onSubmit(trimmedTitle, trimmedDescription);
    setTitle("");
    setDescription("");
    setAnalysis(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus data-icon="inline-start" />
            New idea
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Submit a feature request</DialogTitle>
            <DialogDescription>
              Share an idea. AI suggestions appear as you type (local stub for
              now).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Short summary of your idea"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What problem does this solve?"
                rows={4}
                required
              />
            </div>

            <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-teal-800">
                <Sparkles className="size-3.5" />
                AI assist
                {analyzing ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : null}
              </div>

              {analyzeError ? (
                <p className="text-xs text-amber-700">{analyzeError}</p>
              ) : null}

              {!analyzing && !analyzeError && analysis ? (
                <div className="space-y-2 text-xs text-slate-600">
                  <div>
                    <p className="mb-1 font-medium text-slate-700">
                      Suggested tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 font-medium text-slate-700">
                      Similar requests
                    </p>
                    {analysis.duplicates.length === 0 ? (
                      <p className="text-slate-500">
                        No close duplicates found.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {analysis.duplicates.map((item) => (
                          <li
                            key={item.postId}
                            className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-slate-200/80"
                          >
                            <span className="truncate">{item.title}</span>
                            <span className="shrink-0 tabular-nums text-slate-400">
                              {Math.round(item.score * 100)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                !analyzeError && (
                  <p className="text-xs text-slate-500">
                    Keep typing to check for similar ideas and tags.
                  </p>
                )
              )}
            </div>
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Submit idea</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
