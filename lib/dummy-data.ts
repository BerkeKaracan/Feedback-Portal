import type { Post } from "@/types/database";

export const DUMMY_POSTS: Post[] = [
  {
    id: "1",
    title: "Dark mode for the entire dashboard",
    description:
      "Add a system-aware dark theme so teams can work comfortably in low-light environments.",
    status: "planned",
    author_id: "u1",
    author_name: "Ayşe K.",
    vote_count: 48,
    created_at: "2026-06-12T10:00:00Z",
    has_voted: false,
  },
  {
    id: "2",
    title: "AI duplicate detection before submit",
    description:
      "When a user types a new idea, suggest similar existing requests to reduce duplicates.",
    status: "in-progress",
    author_id: "u2",
    author_name: "Mert Y.",
    vote_count: 41,
    created_at: "2026-06-18T14:30:00Z",
    has_voted: true,
  },
  {
    id: "3",
    title: "Slack notifications for status changes",
    description:
      "Notify voters in Slack when an idea they upvoted moves to Planned, In Progress, or Done.",
    status: "idea",
    author_id: "u3",
    author_name: "Elif D.",
    vote_count: 33,
    created_at: "2026-06-22T09:15:00Z",
    has_voted: false,
  },
  {
    id: "4",
    title: "Public roadmap embed widget",
    description:
      "Allow products to embed a read-only roadmap on their marketing site via a simple script tag.",
    status: "idea",
    author_id: "u4",
    author_name: "Can A.",
    vote_count: 27,
    created_at: "2026-06-28T16:45:00Z",
    has_voted: false,
  },
  {
    id: "5",
    title: "CSV export for feature requests",
    description:
      "Admins should be able to export all posts with vote counts and status for quarterly planning.",
    status: "done",
    author_id: "u5",
    author_name: "Zeynep T.",
    vote_count: 22,
    created_at: "2026-05-30T11:20:00Z",
    has_voted: false,
  },
  {
    id: "6",
    title: "Auto-tagging with AI labels",
    description:
      "Automatically assign tags like UX, Performance, Billing based on the request description.",
    status: "planned",
    author_id: "u2",
    author_name: "Mert Y.",
    vote_count: 19,
    created_at: "2026-07-02T08:00:00Z",
    has_voted: false,
  },
  {
    id: "7",
    title: "Anonymous idea submission",
    description:
      "Let users submit feedback without creating an account while still preventing spam.",
    status: "idea",
    author_id: "u6",
    author_name: "Burak S.",
    vote_count: 14,
    created_at: "2026-07-08T13:10:00Z",
    has_voted: false,
  },
  {
    id: "8",
    title: "Priority scoring for admins",
    description:
      "Combine vote count, customer tier, and effort estimate into a single priority score on the board.",
    status: "idea",
    author_id: "u1",
    author_name: "Ayşe K.",
    vote_count: 11,
    created_at: "2026-07-10T17:40:00Z",
    has_voted: false,
  },
];
