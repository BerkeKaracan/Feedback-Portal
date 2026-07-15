"use client";

import type { Post } from "@/types/database";

import { StatusBadge } from "@/components/board/status-badge";
import { UpvoteButton } from "@/components/board/upvote-button";

type FeatureCardProps = {
  post: Post;
  onToggleVote: (postId: string) => void;
};

export function FeatureCard({ post, onToggleVote }: FeatureCardProps) {
  return (
    <article className="flex gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
      <UpvoteButton
        count={post.vote_count}
        voted={post.has_voted}
        onToggle={() => onToggleVote(post.id)}
      />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium tracking-tight sm:text-base">
            {post.title}
          </h2>
          <StatusBadge status={post.status} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {post.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {post.author_name} ·{" "}
          {new Date(post.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
    </article>
  );
}
