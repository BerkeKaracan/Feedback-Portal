export type PostStatus = "idea" | "planned" | "in-progress" | "done";

export type Profile = {
  id: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
};

export type Post = {
  id: string;
  title: string;
  description: string;
  status: PostStatus;
  author_id: string;
  author_name: string;
  vote_count: number;
  created_at: string;
  tags: string[];
  has_voted?: boolean;
};

export type Vote = {
  id: string;
  post_id: string;
  user_id: string;
};

export const POST_STATUSES: PostStatus[] = [
  "idea",
  "planned",
  "in-progress",
  "done",
];

export const STATUS_LABELS: Record<PostStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  "in-progress": "In Progress",
  done: "Done",
};

export const STATUS_META: Record<
  PostStatus,
  { label: string; hint: string; accent: string; soft: string }
> = {
  idea: {
    label: "Idea",
    hint: "Incoming signal",
    accent: "bg-sky-500",
    soft: "bg-sky-500/10 text-sky-800 dark:text-sky-200",
  },
  planned: {
    label: "Planned",
    hint: "Committed next",
    accent: "bg-amber-500",
    soft: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  "in-progress": {
    label: "In Progress",
    hint: "Actively building",
    accent: "bg-teal-500",
    soft: "bg-teal-500/10 text-teal-800 dark:text-teal-200",
  },
  done: {
    label: "Done",
    hint: "Shipped",
    accent: "bg-emerald-500",
    soft: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
};
