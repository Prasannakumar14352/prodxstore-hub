import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useAuthActions } from "@/hooks/use-auth.ts";

export default function AdminUnauthorizedPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
      // Session is cleared, but nothing on this page watches auth state —
      // send the user back to the login screen explicitly instead of
      // silently leaving them stranded on /admin/unauthorized.
      navigate("/admin", { replace: true });
    } catch {
      setError("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-16 h-16 rounded-2xl border border-destructive/20 bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <p className="text-xs uppercase tracking-widest text-destructive font-medium mb-2">
          Unauthorized
        </p>
        <h1 className="text-2xl font-bold mb-2">No admin access</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your account is signed in but doesn't have admin privileges. Contact the store owner
          if you believe this is a mistake.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive mb-4">
            {error}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/">Back to store</Link>
          </Button>
          <Button
            className="rounded-full gap-2 cursor-pointer"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut && <Loader2 className="w-4 h-4 animate-spin" />}
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
