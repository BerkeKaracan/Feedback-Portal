/** Map Supabase Auth errors to short, production-safe messages. */
export function formatAuthError(error: { message?: string } | string | null) {
  const message = typeof error === "string" ? error : error?.message ?? "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("oauth") ||
    normalized.includes("provider") ||
    normalized.includes("access_denied")
  ) {
    return "Social sign-in was cancelled or failed. Try Google or GitHub again.";
  }

  return message.trim() || "Authentication failed.";
}
