"use client";

import { TagChips } from "@/components/board/tag-chips";
import { formatRelativeDate } from "@/lib/format";
import type { Post } from "@/types/database";

import { StatusBadge } from "@/components/board/status-badge";
import { UpvoteButton } from "@/components/board/upvote-button";

type FeatureCardProps = {
  post: Post;
  onToggleVote: (postId: string) => void;
};

export function FeatureCard({ post, onToggleVote }: FeatureCardProps) {
  return (
    <article className="group flex gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <UpvoteButton
        count={post.vote_count}
        voted={post.has_voted}
        onToggle={() => onToggleVote(post.id)}
      />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            {post.title}
          </h2>
          <StatusBadge status={post.status} />
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
          {post.description}
        </p>
        <TagChips tags={post.tags} />
        <p className="text-xs text-slate-400">
          {post.author_name} · {formatRelativeDate(post.created_at)}
        </p>
      </div>
    </article>
  );
}
