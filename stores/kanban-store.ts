import { create } from "zustand";

import type { Post, PostStatus } from "@/types/database";

type KanbanState = {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  movePost: (postId: string, status: PostStatus) => void;
  getPostsByStatus: (status: PostStatus) => Post[];
};

export const useKanbanStore = create<KanbanState>((set, get) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  movePost: (postId, status) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId ? { ...post, status } : post
      ),
    })),
  getPostsByStatus: (status) =>
    get()
      .posts.filter((post) => post.status === status)
      .sort((a, b) => b.vote_count - a.vote_count),
}));
