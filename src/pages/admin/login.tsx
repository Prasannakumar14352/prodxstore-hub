import { useEffect, useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth } from "@/lib/api/hooks.ts";
import { Package, Loader2 } from "lucide-react";
import { useAuthActions, useCurrentUser } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = !!user && (user.role === "admin" || user.role === "super_admin");

  // Already signed in — route onward without ever flashing the login form.
  useEffect(() => {
    if (isAuthLoading || isUserLoading) return;
    if (isAuthenticated) {
      navigate(isAdmin ? "/admin/dashboard" : "/admin/unauthorized", { replace: true });
    }
  }, [isAuthLoading, isUserLoading, isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email: email.trim(), password, flow: "signIn" });
      navigate("/admin/dashboard", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthLoading || isUserLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
          <p className="text-muted-foreground text-sm">Sign in to access the admin panel.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-full gap-2" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
