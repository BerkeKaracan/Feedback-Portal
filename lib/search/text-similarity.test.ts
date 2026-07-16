import { describe, expect, it } from "vitest";

import {
  findSimilarPosts,
  scanDuplicateGroups,
} from "@/lib/search/duplicates";
import { suggestTags, textSimilarity } from "@/lib/search/text-similarity";

describe("textSimilarity cross-language", () => {
  it("matches improve canvas with canvas iyilestirmesi regardless of order", () => {
    const score = textSimilarity(
      { title: "improve canvas", description: "make it faster" },
      { title: "canvas iyileştirmesi", description: "daha hizli olsun" }
    );
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it("matches dark mode variants across TR/EN", () => {
    const score = textSimilarity(
      { title: "Koyu mod", description: "karanlik tema" },
      { title: "Dark theme", description: "night mode please" }
    );
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it("does not treat unrelated shared broad topics as identical", () => {
    const score = textSimilarity(
      { title: "Add search to comments", description: "find old comments" },
      { title: "Export CSV", description: "download requests as csv" }
    );
    expect(score).toBeLessThan(0.42);
  });
});

describe("suggestTags", () => {
  it("maps TR dark-mode wording to ui", () => {
    expect(
      suggestTags({ title: "Koyu mod", description: "gece temasi" })
    ).toContain("ui");
  });
});

describe("findSimilarPosts", () => {
  it("flags strong duplicates for improve/iyilestirme canvas", () => {
    const result = findSimilarPosts(
      { title: "improve canvas", description: "better canvas" },
      [
        {
          id: "1",
          title: "canvas iyileştirmesi",
          description: "canvas daha iyi olsun",
        },
        {
          id: "2",
          title: "CSV export",
          description: "export data",
        },
      ]
    );

    expect(result.strongDuplicate).toBe(true);
    expect(result.duplicates[0]?.postId).toBe("1");
  });
});

describe("scanDuplicateGroups", () => {
  it("clusters improve canvas with canvas iyilestirmesi for admin Scan", () => {
    const groups = scanDuplicateGroups([
      {
        id: "1",
        title: "improve canvas",
        description: "better canvas",
        status: "idea",
        vote_count: 2,
      },
      {
        id: "2",
        title: "canvas iyileştirmesi",
        description: "canvas daha iyi olsun",
        status: "idea",
        vote_count: 1,
      },
      {
        id: "3",
        title: "CSV export",
        description: "export data",
        status: "idea",
        vote_count: 0,
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.score).toBe(1);
    expect(groups[0]?.posts.map((post) => post.title).sort()).toEqual([
      "canvas iyileştirmesi",
      "improve canvas",
    ]);
  });
});
