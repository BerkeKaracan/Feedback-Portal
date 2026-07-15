import type { AnalyzeIdeaRequest, AnalyzeIdeaResponse } from "@/lib/ai/types";

const TAG_KEYWORDS: Array<{ tag: string; terms: string[] }> = [
  { tag: "ui", terms: ["ui", "ux", "design", "theme", "dark mode", "dashboard"] },
  { tag: "integrations", terms: ["slack", "embed", "webhook", "api", "export"] },
  { tag: "ai", terms: ["ai", "duplicate", "tag", "auto", "suggest"] },
  { tag: "notifications", terms: ["notify", "notification", "email", "alert"] },
  { tag: "admin", terms: ["admin", "export", "csv", "priority", "triage"] },
  { tag: "performance", terms: ["fast", "performance", "slow", "latency"] },
];

function tokenize(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function analyzeIdeaLocally(
  input: AnalyzeIdeaRequest,
  existingPosts: Array<{ id: string; title: string; description: string }>
): AnalyzeIdeaResponse {
  const sourceTokens = tokenize(`${input.title} ${input.description}`);

  const duplicates = existingPosts
    .map((post) => {
      const score = jaccard(
        sourceTokens,
        tokenize(`${post.title} ${post.description}`)
      );
      return {
        postId: post.id,
        title: post.title,
        score: Number(score.toFixed(3)),
      };
    })
    .filter((item) => item.score >= 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const haystack = `${input.title} ${input.description}`.toLowerCase();
  const tags = TAG_KEYWORDS.filter((entry) =>
    entry.terms.some((term) => haystack.includes(term))
  )
    .map((entry) => entry.tag)
    .slice(0, 4);

  return {
    duplicates,
    tags: tags.length > 0 ? tags : ["general"],
    summary: `Heuristic analysis for “${input.title.trim()}”.`,
  };
}
