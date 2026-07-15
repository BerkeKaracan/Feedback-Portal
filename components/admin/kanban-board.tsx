"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { RefreshCw } from "lucide-react";

import { BoardMetrics } from "@/components/admin/board-metrics";
import { BoardToolbar } from "@/components/admin/board-toolbar";
import { KanbanCard } from "@/components/admin/kanban-card";
import { KanbanColumn } from "@/components/admin/kanban-column";
import { RequestDetailSheet } from "@/components/admin/request-detail-sheet";
import { Button } from "@/components/ui/button";
import { fetchPostsWithVotes, updatePostStatus } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { useKanbanStore } from "@/stores/kanban-store";
import {
  POST_STATUSES,
  STATUS_LABELS,
  type Post,
  type PostStatus,
} from "@/types/database";

function resolveStatus(
  overId: string | number,
  posts: Post[]
): PostStatus | null {
  if (POST_STATUSES.includes(overId as PostStatus)) {
    return overId as PostStatus;
  }

  return posts.find((post) => post.id === overId)?.status ?? null;
}

export function KanbanBoard() {
  const supabase = createClient();
  const posts = useKanbanStore((state) => state.posts);
  const setPosts = useKanbanStore((state) => state.setPosts);
  const movePost = useKanbanStore((state) => state.movePost);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [minVotes, setMinVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  async function load(options?: { soft?: boolean }) {
    if (options?.soft) setRefreshing(true);
    setError(null);

    try {
      const { data } = await supabase.auth.getUser();
      const nextPosts = await fetchPostsWithVotes(supabase, data.user?.id);
      setPosts(nextPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (post.vote_count < minVotes) return false;
      if (!normalized) return true;
      return (
        post.title.toLowerCase().includes(normalized) ||
        post.description.toLowerCase().includes(normalized)
      );
    });
  }, [minVotes, posts, query, statusFilter]);

  const columns = useMemo(
    () =>
      POST_STATUSES.map((status) => ({
        status,
        posts: filteredPosts
          .filter((post) => post.status === status)
          .sort((a, b) => b.vote_count - a.vote_count),
      })),
    [filteredPosts]
  );

  const selectedPost =
    posts.find((post) => post.id === selectedPostId) ?? null;

  async function persistStatusChange(
    postId: string,
    nextStatus: PostStatus,
    options?: { closeDetail?: boolean }
  ) {
    const current = posts.find((post) => post.id === postId);
    if (!current || current.status === nextStatus) return;

    const previousStatus = current.status;
    movePost(postId, nextStatus);
    setNotice(`Moved “${current.title}” → ${STATUS_LABELS[nextStatus]}`);
    setError(null);

    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        movePost(postId, previousStatus);
        setError("Sign in to update request status.");
        setNotice(null);
        return;
      }

      await updatePostStatus(supabase, postId, nextStatus);
      if (options?.closeDetail) {
        setDetailOpen(false);
      }
    } catch (err) {
      movePost(postId, previousStatus);
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      setError(
        message.toLowerCase().includes("row-level security") ||
          message.toLowerCase().includes("policy")
          ? "Only admins can change request status."
          : message
      );
      setNotice(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const post = posts.find((item) => item.id === event.active.id) ?? null;
    setActivePost(post);
    setNotice(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActivePost(null);

    if (!over) return;

    const nextStatus = resolveStatus(over.id, posts);
    if (!nextStatus) return;

    await persistStatusChange(String(active.id), nextStatus);
  }

  function handleDragCancel() {
    setActivePost(null);
  }

  function handleOpenPost(post: Post) {
    setSelectedPostId(post.id);
    setDetailOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border bg-white/50"
            />
          ))}
        </div>
        <div className="h-[480px] animate-pulse rounded-3xl border bg-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load({ soft: true })}
          disabled={refreshing}
        >
          <RefreshCw
            data-icon="inline-start"
            className={refreshing ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>

      <BoardMetrics posts={posts} />

      <BoardToolbar
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        minVotes={minVotes}
        onMinVotesChange={setMinVotes}
        visibleCount={filteredPosts.length}
        totalCount={posts.length}
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="animate-board-in rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {notice}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {columns.map((column, index) => (
              <KanbanColumn
                key={column.status}
                status={column.status}
                posts={column.posts}
                index={index}
                onOpenPost={handleOpenPost}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activePost ? <KanbanCard post={activePost} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <RequestDetailSheet
        post={selectedPost}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChange={(postId, status) => {
          void persistStatusChange(postId, status);
        }}
      />
    </div>
  );
}
