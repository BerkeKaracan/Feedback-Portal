"use client";

import { useEffect, useState } from "react";
import { GitMerge, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_LABELS, type PostStatus } from "@/types/database";

type ReviewPost = {
  id: string;
  title: string;
  description: string;
  status: string;
  votes: number;
};

type DuplicateGroup = {
  id: string;
  posts: ReviewPost[];
  score: number;
  minPairScore: number;
  reason: string;
};

type DuplicateReviewProps = {
  onMerged: () => Promise<void> | void;
  projectId?: string | null;
};

export function DuplicateReview({
  onMerged,
  projectId = null,
}: DuplicateReviewProps) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [mergingGroupId, setMergingGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, string[]>>({});
  const [canonicalIds, setCanonicalIds] = useState<Record<string, string>>({});
  const [pendingMerge, setPendingMerge] = useState<{
    group: DuplicateGroup;
    mergeAll: boolean;
  } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const query = params.toString();
      const response = await fetch(
        query ? `/api/search/duplicates?${query}` : "/api/search/duplicates"
      );
      const data = (await response.json()) as {
        groups?: DuplicateGroup[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not scan duplicates");

      const nextGroups = data.groups ?? [];
      setGroups(nextGroups);
      setSelectedIds(
        Object.fromEntries(
          nextGroups.map((group) => [group.id, group.posts.map((post) => post.id)])
        )
      );
      setCanonicalIds(
        Object.fromEntries(nextGroups.map((group) => [group.id, group.posts[0].id]))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not scan duplicates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when tenant board changes
  }, [projectId]);

  function togglePost(group: DuplicateGroup, postId: string) {
    if (postId === canonicalIds[group.id]) return;
    setSelectedIds((current) => {
      const selected = current[group.id] ?? [];
      return {
        ...current,
        [group.id]: selected.includes(postId)
          ? selected.filter((id) => id !== postId)
          : [...selected, postId],
      };
    });
  }

  function chooseCanonical(group: DuplicateGroup, postId: string) {
    setCanonicalIds((current) => ({ ...current, [group.id]: postId }));
    setSelectedIds((current) => ({
      ...current,
      [group.id]: [...new Set([...(current[group.id] ?? []), postId])],
    }));
  }

  function requestMerge(group: DuplicateGroup, mergeAll: boolean) {
    const canonicalId = canonicalIds[group.id];
    const sourceIds = mergeAll
      ? group.posts.map((post) => post.id)
      : (selectedIds[group.id] ?? []);
    const duplicateIds = sourceIds.filter((postId) => postId !== canonicalId);

    if (!canonicalId || duplicateIds.length === 0) {
      setError("Choose a destination request and at least one duplicate.");
      return;
    }

    setPendingMerge({ group, mergeAll });
  }

  async function confirmMerge() {
    if (!pendingMerge) return;
    const { group, mergeAll } = pendingMerge;
    const canonicalId = canonicalIds[group.id];
    const sourceIds = mergeAll
      ? group.posts.map((post) => post.id)
      : (selectedIds[group.id] ?? []);
    const duplicateIds = sourceIds.filter((postId) => postId !== canonicalId);

    setMergingGroupId(group.id);
    setError(null);
    try {
      const response = await fetch("/api/search/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonicalPostId: canonicalId,
          duplicatePostIds: duplicateIds,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Merge failed");
      await onMerged();
      await load();
      setPendingMerge(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMergingGroupId(null);
    }
  }

  const pendingGroup = pendingMerge
    ? groups.find((group) => group.id === pendingMerge.group.id)
    : null;
  const pendingCanonical = pendingGroup?.posts.find(
    (post) => post.id === canonicalIds[pendingMerge!.group.id]
  );
  const pendingDuplicates =
    pendingMerge && pendingGroup
      ? pendingGroup.posts.filter((post) => {
          const canonicalId = canonicalIds[pendingMerge.group.id];
          const sourceIds = pendingMerge.mergeAll
            ? pendingGroup.posts.map((item) => item.id)
            : (selectedIds[pendingMerge.group.id] ?? []);
          return sourceIds.includes(post.id) && post.id !== canonicalId;
        })
      : [];

  return (
    <section className="rounded-3xl border border-violet-200/80 bg-violet-50/60 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-950">
            <ShieldCheck className="size-4 text-violet-600" />
            Duplicate review
          </div>
          <p className="mt-1 text-xs leading-relaxed text-violet-800/80">
            Local text scan — instant and always available. Pick a destination
            (radio), choose which to fold in (checkbox), then merge.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="border-violet-200 bg-white/80"
        >
          <RefreshCw
            data-icon="inline-start"
            className={loading ? "animate-spin" : undefined}
          />
          Scan
        </Button>
      </div>

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

      {!loading && groups.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-white/60 px-3 py-4 text-center text-xs text-violet-700">
          No likely duplicate groups found.
        </p>
      ) : null}

      {groups.length ? (
        <ul className="mt-4 space-y-2">
          {groups.map((group) => (
            <li
              key={group.id}
              className="rounded-2xl border border-violet-100 bg-white/80 p-3"
            >
              <p className="text-xs text-violet-700">
                Best pair {Math.round(group.score * 100)}%
                {group.minPairScore < group.score
                  ? ` · weakest link ${Math.round(group.minPairScore * 100)}%`
                  : ""}{" "}
                · {group.reason}
              </p>
              <div className="mt-3 space-y-2">
                {group.posts.map((post) => {
                  const isCanonical = canonicalIds[group.id] === post.id;
                  const statusLabel =
                    STATUS_LABELS[post.status as PostStatus] ?? post.status;
                  return (
                    <label
                      key={post.id}
                      className="flex cursor-pointer gap-2 rounded-xl px-2 py-2 text-sm hover:bg-violet-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={(selectedIds[group.id] ?? []).includes(post.id)}
                        disabled={isCanonical}
                        onChange={() => togglePost(group, post.id)}
                      />
                      <input
                        type="radio"
                        className="mt-1"
                        name={`merge-target-${group.id}`}
                        checked={isCanonical}
                        onChange={() => chooseCanonical(group, post.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {post.title}
                          </span>
                          {isCanonical ? (
                            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                              keep
                            </span>
                          ) : null}
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                            {statusLabel}
                          </span>
                          <span className="text-xs tabular-nums text-slate-500">
                            {post.votes} votes
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                          {post.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => requestMerge(group, false)}
                  disabled={mergingGroupId === group.id}
                >
                  <GitMerge data-icon="inline-start" />
                  Merge selected
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => requestMerge(group, true)}
                  disabled={mergingGroupId === group.id}
                >
                  <GitMerge data-icon="inline-start" />
                  {mergingGroupId === group.id ? "Merging..." : "Merge all"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog
        open={pendingMerge !== null}
        onOpenChange={(open) => !open && setPendingMerge(null)}
      >
        <DialogContent showCloseButton={!mergingGroupId}>
          <DialogHeader>
            <DialogTitle>Merge duplicate requests?</DialogTitle>
            <DialogDescription>
              {pendingCanonical
                ? `Keep “${pendingCanonical.title}” (${STATUS_LABELS[pendingCanonical.status as PostStatus] ?? pendingCanonical.status}). Merge ${pendingDuplicates.length} request${pendingDuplicates.length === 1 ? "" : "s"} into it — votes, comments, and tags move over; duplicates are deleted.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {pendingDuplicates.length ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
              {pendingDuplicates.map((post) => (
                <li key={post.id} className="truncate rounded-lg bg-slate-50 px-2 py-1">
                  {post.title}
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" disabled={Boolean(mergingGroupId)} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              onClick={() => void confirmMerge()}
              disabled={Boolean(mergingGroupId)}
            >
              <GitMerge data-icon="inline-start" />
              {mergingGroupId ? "Merging..." : "Confirm merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
