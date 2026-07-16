/** Map Supabase Auth errors to short, production-safe messages. */
export function formatAuthError(error: { message?: string } | string | null) {
  const message = typeof error === "string" ? error : error?.message ?? "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Check your email and confirm your account before signing in. If no email arrives, custom SMTP may not be configured yet.";
  }
  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Wrong email or password.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (normalized.includes("signup requires a valid password")) {
    return "Password must be at least 6 characters.";
  }
  if (
    normalized.includes("oauth") ||
    normalized.includes("provider") ||
    normalized.includes("access_denied")
  ) {
    return "Social sign-in was cancelled or failed. Try again, or use email and password.";
  }
  if (normalized.includes("email rate limit") || normalized.includes("over_email_send_rate_limit")) {
    return "Too many emails sent. Wait a bit, or use Google / GitHub sign-in.";
  }

  return message.trim() || "Authentication failed.";
}
