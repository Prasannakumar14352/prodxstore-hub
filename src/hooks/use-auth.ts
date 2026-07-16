import { useAuthActions } from "@/lib/api/hooks.ts";
import { useConvexAuth, useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";

export { useAuthActions };

export function useCurrentUser() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  return {
    user: user ?? null,
    isLoading: isAuthLoading || (isAuthenticated && user === undefined),
  };
}
