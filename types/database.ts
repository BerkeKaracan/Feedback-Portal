export type PostStatus = "idea" | "planned" | "in-progress" | "done";

export type Post = {
  id: string;
  title: string;
  description: string;
  status: PostStatus;
  author_id: string;
  author_name: string;
  vote_count: number;
  created_at: string;
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
