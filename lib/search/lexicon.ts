/**
 * Cross-language lexicon for local duplicate detection.
 * Keys/phrases are matched after normalizeText (TR lowercase, accents stripped).
 */

export type ConceptEntry = {
  concept: string;
  phrases: string[];
};

/** Multi-word / topic groups that collapse TR and EN wording to one id. */
export const CONCEPTS: ConceptEntry[] = [
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
      "gece temasi",
    ],
  },
  {
    concept: "notifications",
    phrases: [
      "notification",
      "notifications",
      "notify",
      "email alert",
      "email alerts",
      "push notification",
      "bildirim",
      "bildirimler",
      "uyari",
      "uyarilar",
      "hatirlatma",
      "hatirlatmalar",
    ],
  },
  {
    concept: "export",
    phrases: [
      "csv export",
      "export data",
      "export csv",
      "data export",
      "disa aktar",
      "disari aktar",
      "veri aktar",
      "csv aktar",
    ],
  },
  {
    concept: "import",
    phrases: [
      "import data",
      "csv import",
      "data import",
      "ice aktar",
      "iceriden aktar",
      "veri ice aktar",
    ],
  },
  {
    concept: "roadmap",
    phrases: [
      "public roadmap",
      "roadmap embed",
      "roadmap widget",
      "yol haritasi",
      "public yol haritasi",
      "roadmap goster",
    ],
  },
  {
    concept: "slack",
    phrases: [
      "slack notification",
      "slack notifications",
      "slack alert",
      "slack entegrasyon",
      "slack bildirim",
      "slack uyarisi",
    ],
  },
  {
    concept: "auth",
    phrases: [
      "sign in",
      "sign up",
      "log in",
      "login",
      "sso",
      "single sign on",
      "authentication",
      "giris yap",
      "uye ol",
      "oturum ac",
      "kimlik dogrulama",
    ],
  },
  {
    concept: "search",
    phrases: [
      "search bar",
      "full text search",
      "global search",
      "arama",
      "arama cubugu",
      "global arama",
      "metin arama",
    ],
  },
  {
    concept: "comments",
    phrases: [
      "comment thread",
      "comments",
      "discussion",
      "yorum",
      "yorumlar",
      "tartisma",
      "yorum zinciri",
    ],
  },
  {
    concept: "upvote",
    phrases: [
      "upvote",
      "upvotes",
      "voting",
      "vote count",
      "oylama",
      "oy ver",
      "oy sayisi",
      "begeni",
    ],
  },
  {
    concept: "kanban",
    phrases: [
      "kanban board",
      "kanban",
      "drag and drop",
      "status board",
      "kanban panosu",
      "surukle birak",
      "durum panosu",
    ],
  },
  {
    concept: "tags",
    phrases: [
      "auto tag",
      "auto tagging",
      "suggest tags",
      "etiket",
      "etiketler",
      "otomatik etiket",
      "etiket oner",
    ],
  },
  {
    concept: "duplicate-detection",
    phrases: [
      "duplicate detection",
      "detect duplicates",
      "similar requests",
      "tekrarlayan istek",
      "kopya tespit",
      "benzer istek",
      "duplicate bul",
    ],
  },
  {
    concept: "embed",
    phrases: [
      "embed widget",
      "embed code",
      "iframe embed",
      "gomulu widget",
      "embed kodu",
      "gom",
    ],
  },
  {
    concept: "webhook",
    phrases: [
      "webhook",
      "webhooks",
      "outgoing webhook",
      "webhook entegrasyon",
    ],
  },
  {
    concept: "email",
    phrases: [
      "email digest",
      "email report",
      "send email",
      "eposta",
      "e posta",
      "mail gonder",
      "eposta ozeti",
    ],
  },
  {
    concept: "mobile",
    phrases: [
      "mobile app",
      "mobile support",
      "responsive",
      "mobil uygulama",
      "mobil destek",
      "mobil uyumlu",
    ],
  },
  {
    concept: "performance",
    phrases: [
      "page speed",
      "load time",
      "slow performance",
      "hiz",
      "performans",
      "yavas",
      "yukleme suresi",
    ],
  },
  {
    concept: "priority",
    phrases: [
      "priority",
      "prioritize",
      "priority score",
      "oncelik",
      "onceliklendir",
      "oncelik skoru",
    ],
  },
  {
    concept: "admin",
    phrases: [
      "admin panel",
      "admin dashboard",
      "moderation",
      "yonetici paneli",
      "yonetim paneli",
      "moderasyon",
    ],
  },
  {
    concept: "api",
    phrases: [
      "public api",
      "rest api",
      "api access",
      "api erisim",
      "herkese acik api",
    ],
  },
  {
    concept: "filter",
    phrases: [
      "filter by status",
      "status filter",
      "filtre",
      "filtrele",
      "duruma gore filtre",
    ],
  },
  {
    concept: "sort",
    phrases: [
      "sort by votes",
      "sort by date",
      "sirala",
      "oylara gore sirala",
      "tarihe gore sirala",
    ],
  },
];

/**
 * Single-token TR/EN synonyms mapped to a shared English-ish canonical token.
 * Applied after normalizeText on each token.
 */
export const SYNONYMS: Record<string, string> = {
  // UI / theme
  tema: "theme",
  thema: "theme",
  koyu: "dark",
  karanlik: "dark",
  gece: "night",
  arayuz: "ui",
  tasarim: "design",

  // Notifications
  bildirim: "notification",
  bildirimler: "notification",
  uyari: "alert",
  uyarilar: "alert",
  hatirlatma: "reminder",
  hatirlatmalar: "reminder",
  notify: "notification",
  notifications: "notification",
  alerts: "alert",

  // Export / import
  disari: "export",
  disa: "export",
  aktar: "export",
  aktarma: "export",
  ice: "import",
  iceaktar: "import",

  // Auth
  giris: "login",
  oturum: "login",
  uyelik: "signup",
  kimlik: "auth",
  dogrulama: "auth",
  authentication: "auth",

  // Search / filter / sort
  arama: "search",
  ara: "search",
  filtre: "filter",
  filtrele: "filter",
  sirala: "sort",
  siralama: "sort",

  // Votes / comments
  oy: "vote",
  oylama: "vote",
  begeni: "upvote",
  yorum: "comment",
  yorumlar: "comment",
  tartisma: "discussion",

  // Tags / duplicates
  etiket: "tag",
  etiketler: "tag",
  kopya: "duplicate",
  tekrarlayan: "duplicate",
  benzer: "similar",

  // Integrations
  entegrasyon: "integration",
  entegrasyonlar: "integration",
  gomulu: "embed",
  gom: "embed",

  // Email / mobile
  eposta: "email",
  posta: "email",
  mobil: "mobile",

  // Performance / admin
  hiz: "performance",
  performans: "performance",
  yavas: "slow",
  yukleme: "load",
  oncelik: "priority",
  onceliklendir: "priority",
  yonetici: "admin",
  yonetim: "admin",
  moderasyon: "moderation",

  // Roadmap / board
  yol: "roadmap",
  haritasi: "roadmap",
  pano: "board",
  panosu: "board",
  durum: "status",

  // Common verbs/nouns in feedback
  ekle: "add",
  ekleyin: "add",
  destek: "support",
  istek: "request",
  ozellik: "feature",
  sorun: "issue",
  hata: "bug",
  iyilestir: "improve",
  gelistir: "improve",
};
