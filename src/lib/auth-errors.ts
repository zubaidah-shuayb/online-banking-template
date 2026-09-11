/** Turns opaque auth failures into something a person can act on. */
export function authErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    console.error("[auth] Network request failed", err);
    return "The authentication service could not be reached. Check the browser console and network connection, then try again.";
  }
  if (/rate limit/i.test(msg)) {
    return "Too many emails were sent from this project in the last hour. Wait a little, or disable email confirmation / add custom SMTP in Supabase.";
  }
  if (/email address .* is invalid/i.test(msg)) {
    return "That email domain isn't accepted. Use a real mailbox address you can receive mail at.";
  }
  if (/invalid login credentials/i.test(msg)) {
    return "Incorrect email or password.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Confirm your email first — check your inbox for the velora verification link.";
  }
  return msg;
}
