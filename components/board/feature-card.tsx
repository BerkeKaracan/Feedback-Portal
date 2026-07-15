"use client";

import { MessageSquare } from "lucide-react";

import { StatusBadge } from "@/components/board/status-badge";
import { TagChips } from "@/components/board/tag-chips";
import { UpvoteButton } from "@/components/board/upvote-button";
import { formatRelativeDate } from "@/lib/format";
import type { Post } from "@/types/database";

type FeatureCardProps = {
  post: Post;
  onToggleVote: (postId: string) => void;
  onOpen: (post: Post) => void;
};

export function FeatureCard({ post, onToggleVote, onOpen }: FeatureCardProps) {
  return (
    <article className="group flex gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <UpvoteButton
        count={post.vote_count}
        voted={post.has_voted}
        onToggle={() => onToggleVote(post.id)}
      />

      <button
        type="button"
        onClick={() => onOpen(post)}
        className="min-w-0 flex-1 space-y-2 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      >
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
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {post.author_name} · {formatRelativeDate(post.created_at)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums text-slate-400 transition-colors group-hover:text-slate-600">
            <MessageSquare className="size-3.5" />
            {post.comment_count}
          </span>
        </div>
      </button>
    </article>
  );
}
