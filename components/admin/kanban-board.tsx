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

import { KanbanCard } from "@/components/admin/kanban-card";
import { KanbanColumn } from "@/components/admin/kanban-column";
import { fetchPostsWithVotes, updatePostStatus } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { useKanbanStore } from "@/stores/kanban-store";
import {
  POST_STATUSES,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data } = await supabase.auth.getUser();
        const nextPosts = await fetchPostsWithVotes(supabase, data.user?.id);
        if (mounted) setPosts(nextPosts);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load board");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [setPosts, supabase]);

  const columns = useMemo(
    () =>
      POST_STATUSES.map((status) => ({
        status,
        posts: posts
          .filter((post) => post.status === status)
          .sort((a, b) => b.vote_count - a.vote_count),
      })),
    [posts]
  );

  function handleDragStart(event: DragStartEvent) {
    const post = posts.find((item) => item.id === event.active.id) ?? null;
    setActivePost(post);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActivePost(null);

    if (!over) return;

    const nextStatus = resolveStatus(over.id, posts);
    if (!nextStatus) return;

    const current = posts.find((post) => post.id === active.id);
    if (!current || current.status === nextStatus) return;

    const previousStatus = current.status;
    movePost(String(active.id), nextStatus);

    try {
      await updatePostStatus(supabase, String(active.id), nextStatus);
    } catch (err) {
      movePost(String(active.id), previousStatus);
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  function handleDragCancel() {
    setActivePost(null);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
        Loading Kanban...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              posts={column.posts}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activePost ? <KanbanCard post={activePost} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
