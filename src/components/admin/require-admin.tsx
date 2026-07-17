import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth } from "@/lib/api/hooks.ts";
import { useCurrentUser } from "@/hooks/use-auth.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { hasAdminAccess } from "@/lib/auth.ts";

// Gates admin-only content: while auth/role status is loading, renders only a
// spinner (no admin content is ever mounted before the check resolves).
// Unauthenticated -> /admin (login). Authenticated but not admin -> /admin/unauthorized.
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const isLoading = isAuthLoading || isUserLoading;
  const isAdmin = !!user && hasAdminAccess(user.role);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/admin", { replace: true });
    } else if (!isAdmin) {
      navigate("/admin/unauthorized", { replace: true });
    }
  }, [isLoading, isAuthenticated, isAdmin, navigate]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
}
