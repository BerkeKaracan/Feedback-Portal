"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { Link2 } from "lucide-react";

import { BoardToolbar } from "@/components/board/board-toolbar";
import { FeatureCard } from "@/components/board/feature-card";
import { PostDetailSheet } from "@/components/board/post-detail-sheet";
import { SubmitIdeaDialog } from "@/components/board/submit-idea-dialog";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { uploadPostAttachment } from "@/lib/attachments";
import {
  createPost,
  fetchPostsWithVotes,
  toggleVote,
} from "@/lib/posts";
import { createPrivateMessage } from "@/lib/private-messages";
import { formatActionError } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { BoardSort, Post, PostAttachment, PostStatus } from "@/types/database";
import type { SubmitIdeaPayload } from "@/components/board/submit-idea-dialog";

export function PublicBoard() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuthProfile();
  const {
    project,
    isTenant,
    loading: tenantLoading,
    features,
  } = useTenant();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BoardSort>("top");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const selectedPostId = searchParams.get("post");
  const detailOpen = Boolean(selectedPostId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectId = project?.id ?? null;

  const loadPosts = useCallback(
    async (userId?: string | null) => {
      setError(null);
      setLoading(true);
      try {
        const data = await fetchPostsWithVotes(supabase, userId, {
          projectId,
          universalOnly: !projectId,
        });
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
      }
    },
    [projectId, supabase]
  );

  useEffect(() => {
    if (authLoading || tenantLoading) return;
    void loadPosts(user?.id);
  }, [authLoading, loadPosts, tenantLoading, user?.id]);

  const sortedPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) {
        return false;
      }
      if (!normalized) return true;
      return (
        post.title.toLowerCase().includes(normalized) ||
        post.description.toLowerCase().includes(normalized) ||
        post.tags.some((tag) => tag.toLowerCase().includes(normalized))
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (b.vote_count !== a.vote_count) {
        return b.vote_count - a.vote_count;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [posts, query, sort, statusFilter]);

  const selectedPost =
    posts.find((post) => post.id === selectedPostId) ?? null;

  const totalVotes = posts.reduce((sum, post) => sum + post.vote_count, 0);

  async function handleToggleVote(postId: string) {
    setActionError(null);

    if (!user) {
      const message = "Sign in to upvote requests.";
      setActionError(message);
      throw new Error(message);
    }

    const current = posts.find((post) => post.id === postId);
    if (!current) return;

    const hasVoted = Boolean(current.has_voted);

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              has_voted: !hasVoted,
              vote_count: post.vote_count + (hasVoted ? -1 : 1),
            }
          : post
      )
    );

    try {
      await toggleVote(supabase, {
        postId,
        userId: user.id,
        hasVoted,
      });
    } catch (err) {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                has_voted: hasVoted,
                vote_count: post.vote_count + (hasVoted ? 1 : -1),
              }
            : post
        )
      );
      const message = formatActionError(err, "Vote failed");
      setActionError(message);
      throw new Error(message);
    }
  }

  async function handleSubmitIdea(payload: SubmitIdeaPayload) {
    setActionError(null);

    if (!user) {
      throw new Error("Sign in to submit a feature request.");
    }

    const created = await createPost(supabase, {
      title: payload.title,
      description: payload.description,
      authorId: user.id,
      tags: payload.tags,
      projectId,
    });

    const publicAttachments: PostAttachment[] = [];
    for (const file of payload.publicImages) {
      publicAttachments.push(
        await uploadPostAttachment(supabase, {
          postId: created.id,
          userId: user.id,
          file,
          visibility: "public",
        })
      );
    }

    if (payload.privateMessage.trim()) {
      const message = await createPrivateMessage(supabase, {
        postId: created.id,
        userId: user.id,
        content: payload.privateMessage,
      });
      for (const file of payload.privateImages) {
        await uploadPostAttachment(supabase, {
          postId: created.id,
          userId: user.id,
          file,
          visibility: "admin_only",
          privateMessageId: message.id,
        });
      }
    }

    setPosts((prev) => [
      {
        id: created.id,
        title: created.title,
        description: created.description,
        status: created.status,
        author_id: created.author_id,
        author_name: profile?.display_name ?? "You",
        vote_count: 1,
        comment_count: 0,
        created_at: created.created_at,
        tags: created.tags ?? payload.tags,
        project_id: created.project_id ?? projectId,
        has_voted: true,
        attachments: publicAttachments,
      },
      ...prev,
    ]);
  }

  function handleCommentCountChange(postId: string, delta: number) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comment_count: Math.max(0, post.comment_count + delta),
            }
          : post
      )
    );
  }

  function setSelectedPost(postId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (postId) params.set("post", postId);
    else params.delete("post");
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function handleOpenPost(post: Post) {
    setSelectedPost(post.id);
  }

  const showLoading = authLoading || tenantLoading || loading;
  const boardLabel = isTenant ? `${project!.name} feedback` : "Public roadmap";
  const boardTitle = isTenant
    ? `What should we improve in ${project!.name}?`
    : "What should we build?";

  return (
    <div className="public-canvas relative flex-1">
      <div className="pointer-events-none absolute inset-0 admin-grid opacity-30" />

      <div className="relative mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <section className="animate-board-in space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.14em] text-(--tenant-primary,#0f766e) uppercase">
                {boardLabel}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {boardTitle}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                {isTenant
                  ? "Vote on the ideas that matter, discuss details, or pitch a new one. Your product team triages everything on the admin roadmap."
                  : "Universal feedback board. Product teams connect their site to get a branded board — name and logo are pulled automatically."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isTenant ? (
                <Link
                  href="/connect"
                  className={cn(buttonVariants({ size: "default" }), "h-10")}
                >
                  <Link2 data-icon="inline-start" />
                  Connect your product
                </Link>
              ) : null}
              {features.submitIdeas ? (
                <SubmitIdeaDialog
                  signedIn={Boolean(user)}
                  authLoading={authLoading}
                  projectId={projectId}
                  enableDuplicateDetection={features.duplicateDetection}
                  onSubmit={handleSubmitIdea}
                  onUpvoteExisting={async (postId) => {
                    const current = posts.find((post) => post.id === postId);
                    if (current?.has_voted) return;
                    await handleToggleVote(postId);
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 tabular-nums">
              {posts.length} requests
            </span>
            <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 tabular-nums">
              {totalVotes} votes
            </span>
          </div>

          <BoardToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            visibleCount={sortedPosts.length}
            totalCount={posts.length}
          />

          {actionError ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
        </section>

        <section className="space-y-3" aria-live="polite">
          {showLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl border bg-white/50"
                />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
              <p>{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadPosts(user?.id)}
              >
                Retry
              </Button>
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center text-sm text-slate-500">
              {query || statusFilter !== "all"
                ? "No requests match your filters."
                : "No requests yet. Sign in and submit the first idea."}
            </div>
          ) : (
            sortedPosts.map((post, index) => (
              <div
                key={post.id}
                className="animate-board-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <FeatureCard
                  post={post}
                  onToggleVote={(postId) => {
                    void handleToggleVote(postId).catch(() => undefined);
                  }}
                  onOpen={handleOpenPost}
                />
              </div>
            ))
          )}
        </section>
      </div>

      <PostDetailSheet
        post={selectedPost}
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
        onToggleVote={(postId) => {
          void handleToggleVote(postId).catch(() => undefined);
        }}
        onCommentCountChange={handleCommentCountChange}
        allowComments={features.comments}
      />
    </div>
  );
}
