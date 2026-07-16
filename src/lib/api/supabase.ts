// Supabase client — replaces ConvexReactClient.
// .env:
//   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon key>

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Surface a clear error during development instead of cryptic fetch failures
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — add them to your .env file.",
  );
}

export const supabase = createClient(url ?? "http://localhost:54321", anonKey ?? "anon", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Invoke a Supabase Edge Function and unwrap errors into thrown Errors. */
export async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body as Record<string, unknown>,
  });
  if (error) {
    // Try to surface the function's JSON error message
    interface FnError { context?: Response }
    const ctx = (error as FnError).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = (await ctx.json()) as { error?: string };
        if (payload?.error) throw new Error(payload.error);
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.includes("JSON")) throw e;
      }
    }
    throw new Error(error.message ?? "Request failed");
  }
  const result = data as T & { error?: string };
  if (result && typeof result === "object" && "error" in result && result.error) {
    throw new Error(String(result.error));
  }
  return data as T;
}
