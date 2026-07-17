import { useEffect, useState } from "react";
import type React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConvexAuth } from "@/lib/api/hooks.ts";
import { ShieldCheck, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuthActions, useCurrentUser } from "@/hooks/use-auth.ts";
import { hasAdminAccess } from "@/lib/auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A11.997 11.997 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.26a12 12 0 0 0 0 10.75l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.63l4.01 3.1C6.22 6.87 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuthActions();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // Authorization is identical regardless of how the user authenticated —
  // it always comes from `public.profiles.role`, never from the login
  // method or anything the client asserts about itself.
  const isAdmin = !!user && hasAdminAccess(user.role);

  // Already signed in — route onward without ever flashing the login form.
  // This also handles the return leg of the Google OAuth redirect: Supabase
  // parses the session from the URL, onAuthStateChange fires, and this
  // effect sends the user to the dashboard or /admin/unauthorized based on
  // their `profiles` row exactly as it would for password login.
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      // Redirect flow — the browser navigates away here. Coming back lands
      // on this same page, which re-runs the effect above to authorize.
      await signInWithGoogle(`${window.location.origin}/admin`);
    } catch {
      setError("Couldn't start Google sign-in. Please try again.");
      setGoogleSubmitting(false);
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
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground relative flex items-center justify-center px-4 py-10">
      {/* Ambient backdrop — distinguishes this from the storefront without a new palette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] bg-[size:32px_32px]" />
      </div>

      <div className="relative w-full" style={{ maxWidth: 440 }}>
        {/* Back to store */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to store
        </Link>

        <div className="rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40 px-6 py-8 sm:px-9 sm:py-10">
          {/* Brand mark + heading */}
          <div className="text-center mb-7">
            <img
              src="https://hercules-cdn.com/file_3y9pBv81Yd6f6aK28NIgGthc"
              alt="ProdXStore"
              className="h-8 w-auto mx-auto mb-6"
            />
            <div className="w-12 h-12 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Admin Portal</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sign in to manage products, orders, customers, and store settings.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full gap-2.5 cursor-pointer mb-5"
            disabled={submitting || googleSubmitting}
            onClick={handleGoogleSignIn}
          >
            {googleSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            {googleSubmitting ? "Redirecting…" : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3 mb-5" aria-hidden="true">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-invalid={!!error}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!error}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full rounded-full gap-2 cursor-pointer"
              disabled={submitting || googleSubmitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        {/* Security notice */}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          Authorized administrators only.
        </p>
      </div>
    </div>
  );
}
