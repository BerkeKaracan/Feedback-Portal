"use client";

import { CheckCircle2, Flame, Lightbulb, LoaderCircle } from "lucide-react";

import type { Post } from "@/types/database";

type BoardMetricsProps = {
  posts: Post[];
};

export function BoardMetrics({ posts }: BoardMetricsProps) {
  const totalVotes = posts.reduce((sum, post) => sum + post.vote_count, 0);
  const ideas = posts.filter((post) => post.status === "idea").length;
  const inFlight = posts.filter(
    (post) => post.status === "planned" || post.status === "in-progress"
  ).length;
  const shipped = posts.filter((post) => post.status === "done").length;

  const metrics = [
    {
      label: "Total demand",
      value: totalVotes,
      detail: `${posts.length} requests`,
      icon: Flame,
    },
    {
      label: "Open ideas",
      value: ideas,
      detail: "Awaiting triage",
      icon: Lightbulb,
    },
    {
      label: "In flight",
      value: inFlight,
      detail: "Planned + building",
      icon: LoaderCircle,
    },
    {
      label: "Shipped",
      value: shipped,
      detail: "Closed loop",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className="admin-metric surface-card animate-board-in px-4 py-3"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                {metric.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
                {metric.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">{metric.detail}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
              <metric.icon className="size-4" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
