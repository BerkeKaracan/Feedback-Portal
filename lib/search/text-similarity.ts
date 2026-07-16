// Local, dependency-free text similarity engine.
//
// This is intentionally independent from any AI/LLM service so search and
// duplicate detection keep working when Gemini is rate-limited, offline, or
// not configured. It normalizes Turkish/English text, canonicalizes a few
// common cross-language feature phrases, and blends token + trigram overlap.

const STOP_WORDS = new Set([
  "and",
  "for",
  "the",
  "with",
  "this",
  "that",
  "you",
  "your",
  "bir",
  "bu",
  "icin",
  "ile",
  "ve",
  "gibi",
  "olan",
  "olarak",
  "istiyorum",
  "lazim",
  "olsun",
]);

// Concept phrases group equivalent feature requests across languages/wording.
// If two texts both contain phrases from the same concept, they are treated as
// the same underlying request even when they share no common characters
// (e.g. Turkish "koyu mod" vs English "dark mode").
const CONCEPTS: Array<{ concept: string; phrases: string[] }> = [
  {
    concept: "dark-mode",
    phrases: [
      "dark mode",
      "dark theme",
      "dark thema",
      "night mode",
      "night theme",
      "koyu mod",
      "koyu tema",
      "karanlik mod",
      "karanlik tema",
      "gece modu",
      "gece tema",
    ],
  },
  {
    concept: "notifications",
    phrases: [
      "notification",
      "notify",
      "email alert",
      "bildirim",
      "uyari",
      "hatirlatma",
    ],
  },
  {
    concept: "export",
    phrases: ["csv export", "export data", "da disari aktar", "disa aktar", "export"],
  },
];

export function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Extracts the set of known concepts present anywhere in the given text.
export function extractConcepts(...values: string[]): Set<string> {
  const haystack = ` ${normalizeText(values.join(" "))} `;
  const concepts = new Set<string>();
  for (const { concept, phrases } of CONCEPTS) {
    if (phrases.some((phrase) => haystack.includes(` ${normalizeText(phrase)} `) || haystack.includes(normalizeText(phrase)))) {
      concepts.add(concept);
    }
  }
  return concepts;
}

function canonicalTitle(value: string) {
  return normalizeText(value).replace(/\bthema\b/g, "theme").split(/\s+/).filter(Boolean).join("-");
}

export function tokenize(value: string) {
  return new Set(
    normalizeText(value)
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
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

function trigrams(value: string) {
  const compact = ` ${normalizeText(value)} `;
  const grams = new Set<string>();
  for (let index = 0; index < compact.length - 2; index += 1) {
    grams.add(compact.slice(index, index + 3));
  }
  return grams;
}

export type SimilarityInput = {
  title: string;
  description?: string;
};

/**
 * Returns a 0–1 similarity score between two feature requests using a blend of
 * canonical-phrase equality, token overlap, and character trigram overlap.
 */
export function textSimilarity(a: SimilarityInput, b: SimilarityInput): number {
  // Exact canonical title match (e.g. "Dark Thema" vs "dark theme").
  if (canonicalTitle(a.title) === canonicalTitle(b.title)) return 1;

  // Shared concept across languages/wording (e.g. "koyu mod" vs "dark mode").
  const conceptsA = extractConcepts(a.title, a.description ?? "");
  const conceptsB = extractConcepts(b.title, b.description ?? "");
  for (const concept of conceptsA) {
    if (conceptsB.has(concept)) return 0.95;
  }

  const titleTokenScore = jaccard(tokenize(a.title), tokenize(b.title));
  const documentTokenScore = jaccard(
    tokenize(`${a.title} ${a.description ?? ""}`),
    tokenize(`${b.title} ${b.description ?? ""}`)
  );
  const titleTrigramScore = jaccard(trigrams(a.title), trigrams(b.title));

  return Math.max(
    titleTokenScore * 0.8 + titleTrigramScore * 0.2,
    titleTrigramScore * 0.65 + documentTokenScore * 0.35
  );
}

const TAG_KEYWORDS: Array<{ tag: string; terms: string[] }> = [
  { tag: "ui", terms: ["ui", "ux", "design", "theme", "dark", "mode", "dashboard"] },
  { tag: "integrations", terms: ["slack", "embed", "webhook", "api", "export", "import"] },
  { tag: "ai", terms: ["ai", "duplicate", "tag", "auto", "suggest", "semantic"] },
  { tag: "notifications", terms: ["notify", "notification", "email", "alert", "reminder"] },
  { tag: "admin", terms: ["admin", "export", "csv", "priority", "triage", "manage"] },
  { tag: "performance", terms: ["fast", "performance", "slow", "latency", "speed"] },
];

export function suggestTags(input: SimilarityInput): string[] {
  const haystack = ` ${normalizeText(`${input.title} ${input.description ?? ""}`)} `;
  const tags = TAG_KEYWORDS.filter((entry) =>
    entry.terms.some((term) => haystack.includes(` ${term} `) || haystack.includes(term))
  )
    .map((entry) => entry.tag)
    .slice(0, 4);

  return tags.length > 0 ? tags : ["general"];
}
