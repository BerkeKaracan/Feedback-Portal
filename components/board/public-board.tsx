"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { FeatureCard } from "@/components/board/feature-card";
import { SubmitIdeaDialog } from "@/components/board/submit-idea-dialog";
import { Input } from "@/components/ui/input";
import {
  createPost,
  fetchPostsWithVotes,
  toggleVote,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import type { Post } from "@/types/database";

export function PublicBoard() {
  const supabase = createClient();
  const { user, profile } = useAuthProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPosts = useCallback(
    async (userId?: string | null) => {
      setError(null);
      try {
        const data = await fetchPostsWithVotes(supabase, userId);
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadPosts(user?.id);
  }, [loadPosts, user?.id]);

  const sortedPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...posts]
      .filter((post) => {
        if (!normalized) return true;
        return (
          post.title.toLowerCase().includes(normalized) ||
          post.description.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => b.vote_count - a.vote_count);
  }, [posts, query]);

  const totalVotes = posts.reduce((sum, post) => sum + post.vote_count, 0);

  async function handleToggleVote(postId: string) {
    setActionError(null);

    if (!user) {
      setActionError("Sign in to upvote requests.");
      return;
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
      setActionError(err instanceof Error ? err.message : "Vote failed");
    }
  }

  async function handleSubmitIdea(title: string, description: string) {
    setActionError(null);

    if (!user) {
      setActionError("Sign in to submit a feature request.");
      return;
    }

    try {
      const created = await createPost(supabase, {
        title,
        description,
        authorId: user.id,
      });

      setPosts((prev) => [
        {
          id: created.id,
          title: created.title,
          description: created.description,
          status: created.status,
          author_id: created.author_id,
          author_name: profile?.display_name ?? "You",
          vote_count: 0,
          created_at: created.created_at,
          has_voted: false,
        },
        ...prev,
      ]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Submit failed");
    }
  }

  return (
    <div className="public-canvas relative flex-1">
      <div className="pointer-events-none absolute inset-0 admin-grid opacity-30" />

      <div className="relative mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <section className="animate-board-in space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.14em] text-teal-700 uppercase">
                Public roadmap
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                What should we build?
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                Vote on the ideas that matter, or pitch a new one. The team
                triages everything on the admin roadmap.
              </p>
            </div>
            <SubmitIdeaDialog onSubmit={handleSubmitIdea} />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 tabular-nums">
              {posts.length} requests
            </span>
            <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 tabular-nums">
              {totalVotes} votes
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests..."
              className="border-slate-200 bg-white/80 pl-8"
              aria-label="Search feature requests"
            />
          </div>

          {actionError ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
        </section>

        <section className="space-y-3" aria-live="polite">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl border bg-white/50"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
              {error}
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center text-sm text-slate-500">
              {query
                ? "No requests match your search."
                : "No requests yet. Sign in and submit the first idea."}
            </div>
          ) : (
            sortedPosts.map((post, index) => (
              <div
                key={post.id}
                className="animate-board-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <FeatureCard post={post} onToggleVote={handleToggleVote} />
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
