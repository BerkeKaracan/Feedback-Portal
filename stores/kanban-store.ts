import { create } from "zustand";

import type { Post, PostStatus } from "@/types/database";

type KanbanState = {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  movePost: (postId: string, status: PostStatus) => void;
  updatePostTags: (postId: string, tags: string[]) => void;
  removePost: (postId: string) => void;
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
  updatePostTags: (postId, tags) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId ? { ...post, tags } : post
      ),
    })),
  removePost: (postId) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== postId),
    })),
  getPostsByStatus: (status) =>
    get()
      .posts.filter((post) => post.status === status)
      .sort((a, b) => b.vote_count - a.vote_count),
}));
