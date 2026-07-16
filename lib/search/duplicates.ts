import {
  suggestTags,
  textSimilarity,
  type SimilarityInput,
} from "@/lib/search/text-similarity";

export type SearchablePost = {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  status?: string;
  vote_count?: number;
};

export type LocalDuplicate = {
  postId: string;
  title: string;
  score: number;
  reason: string;
};

export type LocalSimilarResult = {
  duplicates: LocalDuplicate[];
  tags: string[];
  strongDuplicate: boolean;
};

// Threshold tuning: below SIMILAR is ignored, at/above STRONG we warn the user
// that an equivalent request almost certainly already exists.
export const SIMILAR_THRESHOLD = 0.42;
export const STRONG_THRESHOLD = 0.78;

/**
 * Finds existing posts similar to a proposed idea. Pure local computation, so
 * it always works regardless of AI availability.
 */
export function findSimilarPosts(
  input: SimilarityInput,
  posts: SearchablePost[]
): LocalSimilarResult {
  const duplicates = posts
    .map((post) => ({
      postId: post.id,
      title: post.title,
      score: Number(textSimilarity(input, post).toFixed(3)),
      reason: "Matched locally by title, wording, and spelling.",
    }))
    .filter((item) => item.score >= SIMILAR_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    duplicates,
    tags: suggestTags(input),
    strongDuplicate: Boolean(duplicates[0] && duplicates[0].score >= STRONG_THRESHOLD),
  };
}

export type DuplicatePairPost = {
  id: string;
  title: string;
  votes: number;
};

export type DuplicateGroup = {
  id: string;
  posts: DuplicatePairPost[];
  score: number;
  reason: string;
};

/**
 * Scans all posts pairwise and clusters mutually-similar posts into groups,
 * ready for admin review + merge. O(n^2) which is fine for MVP volumes.
 */
export function scanDuplicateGroups(
  posts: SearchablePost[],
  threshold = SIMILAR_THRESHOLD
): DuplicateGroup[] {
  const parent = new Map<string, string>();
  const bestScore = new Map<string, number>();
  const bestReason = new Map<string, string>();

  const root = (id: string): string => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const resolved = root(current);
    parent.set(id, resolved);
    return resolved;
  };

  const union = (a: string, b: string) => {
    const rootA = root(a);
    const rootB = root(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  for (const post of posts) {
    parent.set(post.id, post.id);
  }

  for (let i = 0; i < posts.length; i += 1) {
    for (let j = i + 1; j < posts.length; j += 1) {
      const score = textSimilarity(posts[i], posts[j]);
      if (score < threshold) continue;

      union(posts[i].id, posts[j].id);
      const groupKey = root(posts[i].id);
      if (score > (bestScore.get(groupKey) ?? 0)) {
        bestScore.set(groupKey, score);
        bestReason.set(
          groupKey,
          score >= 0.99
            ? "Near-identical wording."
            : "High local text similarity."
        );
      }
    }
  }

  const detailsById = new Map(posts.map((post) => [post.id, post]));
  const grouped = new Map<string, Set<string>>();

  for (const post of posts) {
    const key = root(post.id);
    if (!bestScore.has(key)) continue;
    const set = grouped.get(key) ?? new Set<string>();
    set.add(post.id);
    grouped.set(key, set);
  }

  return [...grouped.entries()]
    .map(([key, ids]) => {
      const groupPosts = [...ids]
        .map((id) => {
          const post = detailsById.get(id)!;
          return {
            id: post.id,
            title: post.title,
            votes: post.vote_count ?? 0,
          };
        })
        .sort((a, b) => b.votes - a.votes);

      // Merge the per-group best score onto the canonical root key.
      let score = bestScore.get(key) ?? 0;
      let reason = bestReason.get(key) ?? "High local text similarity.";
      for (const id of ids) {
        const candidate = bestScore.get(id);
        if (candidate && candidate > score) {
          score = candidate;
          reason = bestReason.get(id) ?? reason;
        }
      }

      return {
        id: key,
        posts: groupPosts,
        score: Number(score.toFixed(3)),
        reason,
      };
    })
    .filter((group) => group.posts.length > 1)
    .sort((a, b) => b.score - a.score);
}
