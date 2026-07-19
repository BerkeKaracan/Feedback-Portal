"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, LoaderCircle, Plus, Sparkles } from "lucide-react";

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
import { ImageFilePicker } from "@/components/board/image-file-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatActionError } from "@/lib/rate-limit";
import { cn } from "@/lib/utils";

type SimilarResponse = {
  duplicates: Array<{
    postId: string;
    title: string;
    score: number;
    reason?: string;
  }>;
  tags: string[];
  strongDuplicate: boolean;
  mode: "local";
};

export type SubmitIdeaPayload = {
  title: string;
  description: string;
  tags: string[];
  publicImages: File[];
  privateMessage: string;
  privateImages: File[];
};

type SubmitIdeaDialogProps = {
  signedIn: boolean;
  authLoading?: boolean;
  /** Scope duplicate checks / tags to a tenant board when set. */
  projectId?: string | null;
  enableDuplicateDetection?: boolean;
  onSubmit: (payload: SubmitIdeaPayload) => Promise<void>;
  onUpvoteExisting?: (postId: string) => Promise<void> | void;
};

export function SubmitIdeaDialog({
  signedIn,
  authLoading = false,
  projectId = null,
  enableDuplicateDetection = true,
  onSubmit,
  onUpvoteExisting,
}: SubmitIdeaDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<SimilarResponse | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [publicImages, setPublicImages] = useState<File[]>([]);
  const [privateMessage, setPrivateMessage] = useState("");
  const [privateImages, setPrivateImages] = useState<File[]>([]);
  const [privateOpen, setPrivateOpen] = useState(false);
  const tagsTouchedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      tagsTouchedRef.current = false;
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!enableDuplicateDetection) {
      setAnalysis(null);
      setAnalyzeError(null);
      setAnalyzing(false);
      return;
    }

    if (trimmedTitle.length < 4) {
      setAnalysis(null);
      if (!tagsTouchedRef.current) setSelectedTags([]);
      setAnalyzeError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAnalyzing(true);
      setAnalyzeError(null);

      try {
        const response = await fetch("/api/search/similar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            description: trimmedDescription,
            projectId,
          }),
          signal: controller.signal,
        });

        const data = (await response.json()) as SimilarResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Search failed");
        }

        setAnalysis(data);
        if (!tagsTouchedRef.current) {
          setSelectedTags(data.tags);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setAnalysis(null);
        if (!tagsTouchedRef.current) setSelectedTags([]);
        setAnalyzeError(
          formatActionError(error, "Could not check for similar ideas right now.")
        );
      } finally {
        setAnalyzing(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [description, enableDuplicateDetection, open, projectId, title]);

  function toggleTag(tag: string) {
    tagsTouchedRef.current = true;
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setAnalysis(null);
    setSelectedTags([]);
    setAnalyzeError(null);
    setSubmitError(null);
    setPublicImages([]);
    setPrivateMessage("");
    setPrivateImages([]);
    setPrivateOpen(false);
    tagsTouchedRef.current = false;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription || submitting) return;

    if (!signedIn) {
      setSubmitError("Sign in to submit a feature request.");
      return;
    }

    const trimmedPrivate = privateMessage.trim();
    if (privateImages.length > 0 && !trimmedPrivate) {
      setSubmitError("Add a private message when attaching private images.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        title: trimmedTitle,
        description: trimmedDescription,
        tags: selectedTags,
        publicImages,
        privateMessage: trimmedPrivate,
        privateImages,
      });
      resetForm();
      setOpen(false);
    } catch (error) {
      setSubmitError(
        formatActionError(error, "Submit failed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpvote(postId: string) {
    if (!onUpvoteExisting || upvotingId) return;

    if (!signedIn) {
      setSubmitError("Sign in to upvote requests.");
      return;
    }

    setUpvotingId(postId);
    setSubmitError(null);

    try {
      await onUpvoteExisting(postId);
      setOpen(false);
    } catch (error) {
      setSubmitError(
        formatActionError(error, "Vote failed")
      );
    } finally {
      setUpvotingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        setOpen(next);
        if (!next) {
          setSubmitError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button disabled={authLoading}>
            <Plus data-icon="inline-start" />
            New idea
          </Button>
        }
      />
      <DialogContent
        className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={!submitting}
      >
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 space-y-1.5 px-4 pt-4 pr-12">
            <DialogTitle>Submit a feature request</DialogTitle>
            <DialogDescription>
              {signedIn
                ? "Check for similar requests, add screenshots, then submit."
                : "Sign in to submit a request. You can still preview similar ideas below."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 py-3">
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
                minLength={3}
                maxLength={120}
                disabled={submitting}
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
                rows={3}
                required
                minLength={8}
                maxLength={4000}
                disabled={submitting}
              />
            </div>

            <ImageFilePicker
              files={publicImages}
              onChange={setPublicImages}
              maxFiles={3}
              label="Screenshots"
              hint="Optional · JPEG/PNG/WebP · max 2 MB each."
              disabled={submitting}
            />

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left text-sm font-medium text-amber-950"
                onClick={() => setPrivateOpen((value) => !value)}
              >
                Message for admins only
                <span className="text-xs font-normal text-amber-800/80">
                  {privateOpen ? "Hide" : "Show"}
                </span>
              </button>
              <p className="mt-1 text-xs text-amber-900/70">
                Not shown on the public board — only product admins can read
                this (order IDs, payment details, etc.).
              </p>
              {privateOpen ? (
                <div className="mt-3 grid gap-3">
                  <Textarea
                    value={privateMessage}
                    onChange={(event) => setPrivateMessage(event.target.value)}
                    placeholder="Private note for admins…"
                    rows={3}
                    maxLength={2000}
                    disabled={submitting}
                  />
                  <ImageFilePicker
                    files={privateImages}
                    onChange={setPrivateImages}
                    maxFiles={2}
                    label="Private images"
                    hint="Only admins can see these."
                    disabled={submitting}
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-teal-800">
                <Sparkles className="size-3.5" />
                Smart matching
                {analyzing ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : null}
              </div>

              {analyzeError ? (
                <p className="text-xs text-amber-700">{analyzeError}</p>
              ) : null}

              {!analyzing && !analyzeError && analysis ? (
                <div className="space-y-3 text-xs text-slate-600">
                  {analysis.strongDuplicate ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-800">
                      <p className="font-semibold">
                        A very similar request already exists.
                      </p>
                      <p className="mt-0.5">
                        Upvote it below to consolidate feedback, or submit
                        anyway if your need is materially different.
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-1 font-medium text-slate-700">
                      Suggested tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.tags.map((tag) => {
                        const active = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            disabled={submitting}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] ring-1 transition-colors",
                              active
                                ? "bg-slate-900 text-white ring-slate-900"
                                : "bg-white text-slate-500 ring-slate-200"
                            )}
                          >
                            {tag}
                          </button>
                        );
                      })}
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
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-700">
                                {item.title}
                              </p>
                              <p className="tabular-nums text-slate-400">
                                {Math.round(item.score * 100)}% match
                              </p>
                              {item.reason ? (
                                <p className="mt-0.5 line-clamp-2 text-slate-500">
                                  {item.reason}
                                </p>
                              ) : null}
                            </div>
                            {onUpvoteExisting ? (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                disabled={Boolean(upvotingId) || submitting}
                                onClick={() => void handleUpvote(item.postId)}
                              >
                                <ChevronUp data-icon="inline-start" />
                                {upvotingId === item.postId
                                  ? "..."
                                  : "Upvote"}
                              </Button>
                            ) : null}
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

            {submitError ? (
              <p className="sticky bottom-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
          </div>

          <DialogFooter
            showCloseButton={false}
            className="mx-0 mb-0 shrink-0 rounded-none border-t bg-muted/50 p-4"
          >
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || authLoading}>
              {submitting
                ? "Submitting..."
                : signedIn
                  ? "Submit idea"
                  : "Sign in to submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
