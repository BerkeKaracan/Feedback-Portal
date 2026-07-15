"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
import type { Post } from "@/types/database";

export function PublicBoard() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null);
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
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user);
      await loadPosts(data.user?.id);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadPosts(nextUser?.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadPosts, supabase.auth]);

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
          author_name: "You",
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
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Public roadmap
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Feature requests
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Live data from local Supabase. Sign in to submit ideas and vote.
            </p>
          </div>
          <SubmitIdeaDialog onSubmit={handleSubmitIdea} />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search requests..."
            className="pl-8"
            aria-label="Search feature requests"
          />
        </div>

        {actionError ? (
          <p className="text-sm text-destructive">{actionError}</p>
        ) : null}
      </section>

      <section className="space-y-3" aria-live="polite">
        {loading ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            Loading requests...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-destructive">
            {error}
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            {query
              ? "No requests match your search."
              : "No requests yet. Sign in and submit the first idea."}
          </div>
        ) : (
          sortedPosts.map((post) => (
            <FeatureCard
              key={post.id}
              post={post}
              onToggleVote={handleToggleVote}
            />
          ))
        )}
      </section>
    </div>
  );
}
