import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export { useAuthActions };

export function useCurrentUser() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  return {
    user: user ?? null,
    isLoading: isAuthLoading || (isAuthenticated && user === undefined),
  };
}
