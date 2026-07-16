// Shim for `convex/values` — keeps `ConvexError` imports working after the
// Supabase migration. Errors thrown by the api layer are plain Errors; this
// class exists so existing `instanceof ConvexError` checks still compile.

export class ConvexError<T = { code?: string; message?: string }> extends Error {
  data: T;
  constructor(data: T) {
    const message =
      typeof data === "string"
        ? data
        : ((data as { message?: string })?.message ?? "Application error");
    super(message);
    this.name = "ConvexError";
    this.data = data;
  }
}
