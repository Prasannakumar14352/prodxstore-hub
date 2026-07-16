// Maps Postgres rows (snake_case, id/created_at) to the Convex-style shapes
// the app already uses (camelCase, _id/_creationTime) and back.

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Postgres row → Convex-style doc */
export function toDoc<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") {
      out._id = value;
    } else if (key === "created_at") {
      out._creationTime = value ? new Date(value as string).getTime() : Date.now();
    } else {
      const v = value === null ? undefined : value;
      out[snakeToCamel(key)] = v;
    }
  }
  // Legacy aliases used by existing components
  if ("storagePath" in out && out.storagePath !== undefined) out.storageId = out.storagePath;
  if ("mediaPaths" in out && out.mediaPaths !== undefined) out.mediaStorageIds = out.mediaPaths;
  return out as T;
}

export function toDocs<T>(rows: Record<string, unknown>[] | null): T[] {
  return (rows ?? []).map((r) => toDoc<T>(r));
}

/** Convex-style patch → Postgres row (drops _id/_creationTime + legacy aliases) */
export function toRow(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === "_id" || key === "_creationTime" || value === undefined) continue;
    if (key === "storageId") { out.storage_path = value; continue; }
    if (key === "mediaStorageIds") { out.media_paths = value; continue; }
    out[camelToSnake(key)] = value;
  }
  return out;
}

/** Throws a readable Error from a Supabase error, if present. */
export function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
