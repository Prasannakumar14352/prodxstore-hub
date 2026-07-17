// Single source of truth for "does this role get into /admin".
// Keep every route guard and UI gate calling this instead of comparing
// `role` inline, so admin/super_admin never drift out of sync again.
export function hasAdminAccess(role: string | null | undefined): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === "admin" || normalized === "super_admin";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role?.trim().toLowerCase() === "super_admin";
}
