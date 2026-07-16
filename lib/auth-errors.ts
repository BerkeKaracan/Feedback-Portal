/** Map Supabase Auth errors to short, production-safe messages. */
export function formatAuthError(error: { message?: string } | string | null) {
  const message = typeof error === "string" ? error : error?.message ?? "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "This email is not confirmed yet. If you just signed up, try signing in again — or ask the site owner to disable email confirmation for MVP signup.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "Wrong email or password.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (normalized.includes("signup requires a valid password")) {
    return "Password must be at least 6 characters.";
  }

  return message.trim() || "Authentication failed.";
}
