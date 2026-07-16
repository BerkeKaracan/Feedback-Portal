// Local, dependency-free text similarity engine.
//
// Normalizes Turkish/English text, maps tokens and multi-word phrases onto a
// shared concept/synonym space (see lexicon.ts), then blends token + trigram
// overlap. No external API or quota.

import { CONCEPTS, LEMMA_PREFIXES, SYNONYMS } from "@/lib/search/lexicon";

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
  "add",
  "please",
  "lutfen",
]);

export function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalizeToken(token: string) {
  const direct = SYNONYMS[token];
  if (direct) return direct;

  for (const [prefix, lemma] of LEMMA_PREFIXES) {
    if (token === prefix || token.startsWith(prefix)) return lemma;
  }

  // Strip common TR noun/verb endings, then re-check synonyms/prefixes.
  const suffixes = [
    "tirmesi",
    "tirmeyi",
    "tirmeye",
    "tirmenin",
    "tirmek",
    "tirme",
    "mesi",
    "meyi",
    "meye",
    "menin",
    "mek",
    "me",
    "lari",
    "leri",
    "lar",
    "ler",
    "ing",
    "ment",
    "ments",
  ];
  for (const suffix of suffixes) {
    if (token.length > suffix.length + 3 && token.endsWith(suffix)) {
      const stem = token.slice(0, -suffix.length);
      if (SYNONYMS[stem]) return SYNONYMS[stem];
      for (const [prefix, lemma] of LEMMA_PREFIXES) {
        if (stem === prefix || stem.startsWith(prefix)) return lemma;
      }
    }
  }

  return token;
}

/** Concepts present anywhere in the joined text (word-bounded phrase match). */
export function extractConcepts(...values: string[]): Set<string> {
  // Pad with spaces so short tokens like "oy" cannot match inside "koyu".
  const haystack = ` ${normalizeText(values.join(" "))} `;
  const concepts = new Set<string>();

  for (const { concept, phrases } of CONCEPTS) {
    const hit = phrases.some((phrase) => {
      const normalized = normalizeText(phrase);
      if (normalized.length < 3) return false;
      return haystack.includes(` ${normalized} `);
    });
    if (hit) concepts.add(concept);
  }

  return concepts;
}

/** Order-independent title signature in the synonym space. */
function titleSignature(value: string) {
  return [...tokenizeTitle(value)].sort().join("|");
}

function tokenizeTitle(value: string) {
  const tokens = new Set(
    normalizeText(value)
      .replace(/\bthema\b/g, "theme")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
      .map(canonicalizeToken)
  );

  for (const concept of extractConcepts(value)) {
    tokens.add(concept);
  }

  return tokens;
}

/**
 * Token set in the shared synonym/concept space: stop-words removed,
 * synonyms remapped, and matched concept ids injected as tokens.
 */
export function tokenize(value: string) {
  const normalized = normalizeText(value);
  const tokens = new Set(
    normalized
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
      .map(canonicalizeToken)
  );

  for (const concept of extractConcepts(value)) {
    tokens.add(concept);
  }

  return tokens;
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

/** Trigrams over a space-joined canonical token stream (cross-language). */
function canonicalTrigrams(value: string) {
  const tokens = [...tokenize(value)];
  const compact = ` ${tokens.join(" ")} `;
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
 * canonical-phrase equality, shared concepts, and token/trigram overlap in the
 * synonym-normalized space.
 */
export function textSimilarity(a: SimilarityInput, b: SimilarityInput): number {
  // Same content words in any order after TR/EN canonicalization
  // ("improve canvas" ≡ "canvas iyilestirmesi").
  if (titleSignature(a.title) && titleSignature(a.title) === titleSignature(b.title)) {
    return 1;
  }

  const conceptsA = extractConcepts(a.title, a.description ?? "");
  const conceptsB = extractConcepts(b.title, b.description ?? "");
  let sharedConcepts = 0;
  for (const concept of conceptsA) {
    if (conceptsB.has(concept)) sharedConcepts += 1;
  }

  const titleTokenScore = jaccard(tokenizeTitle(a.title), tokenizeTitle(b.title));
  const documentTokenScore = jaccard(
    tokenize(`${a.title} ${a.description ?? ""}`),
    tokenize(`${b.title} ${b.description ?? ""}`)
  );
  const titleTrigramScore = jaccard(
    canonicalTrigrams(a.title),
    canonicalTrigrams(b.title)
  );

  const lexicalScore = Math.max(
    titleTokenScore * 0.8 + titleTrigramScore * 0.2,
    titleTrigramScore * 0.65 + documentTokenScore * 0.35
  );

  // Near-identical titles after synonym mapping are strong duplicates.
  if (titleTokenScore >= 0.75) {
    return Math.max(lexicalScore, 0.9);
  }

  // Shared concepts boost similarity but alone are not enough for a
  // strong-duplicate (0.78+) hit — avoids "both mention search" false positives.
  if (sharedConcepts >= 2) {
    return Math.max(lexicalScore, 0.92);
  }
  if (sharedConcepts === 1) {
    // Same product concept + any shared title token (e.g. dark/theme/mode family)
    // is a strong cross-language duplicate signal.
    if (titleTokenScore >= 0.25) {
      return Math.max(lexicalScore, 0.9);
    }
    return Math.min(0.85, Math.max(lexicalScore, 0.55 + lexicalScore * 0.35));
  }

  return lexicalScore;
}

const TAG_KEYWORDS: Array<{ tag: string; terms: string[] }> = [
  {
    tag: "ui",
    terms: ["ui", "ux", "design", "theme", "dark", "mode", "dashboard", "dark-mode"],
  },
  {
    tag: "integrations",
    terms: ["slack", "embed", "webhook", "api", "export", "import", "integration"],
  },
  {
    tag: "ai",
    terms: ["ai", "duplicate", "tag", "auto", "suggest", "semantic", "duplicate-detection"],
  },
  {
    tag: "notifications",
    terms: ["notify", "notification", "email", "alert", "reminder", "notifications"],
  },
  {
    tag: "admin",
    terms: ["admin", "export", "csv", "priority", "triage", "manage", "moderation"],
  },
  {
    tag: "performance",
    terms: ["fast", "performance", "slow", "latency", "speed"],
  },
];

/**
 * Suggest tags from the synonym/concept-normalized token stream so TR and EN
 * wording map to the same tag keywords.
 */
export function suggestTags(input: SimilarityInput): string[] {
  const tokens = tokenize(`${input.title} ${input.description ?? ""}`);
  const haystack = ` ${[...tokens].join(" ")} `;

  const tags = TAG_KEYWORDS.filter((entry) =>
    entry.terms.some((term) => {
      const normalized = normalizeText(term);
      return haystack.includes(` ${normalized} `) || tokens.has(normalized);
    })
  )
    .map((entry) => entry.tag)
    .slice(0, 4);

  return tags.length > 0 ? tags : ["general"];
}
