import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Shown in the error UI to help the user understand where the crash occurred */
  context?: string;
  /** If true, show a minimal inline error instead of a full-page layout */
  inline?: boolean;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

// ─── Error Boundary Class Component ──────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for debugging — in production you could send to an error tracking service
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.inline) {
      return (
        <InlineErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          context={this.props.context}
        />
      );
    }

    return (
      <FullPageErrorFallback
        error={this.state.error}
        onReset={this.handleReset}
        context={this.props.context}
      />
    );
  }
}

// ─── Full-page fallback ───────────────────────────────────────────────────────

function FullPageErrorFallback({
  error,
  onReset,
  context,
}: {
  error: Error | null;
  onReset: () => void;
  context?: string;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl border border-destructive/25 bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {context
            ? `An unexpected error occurred in ${context}.`
            : "An unexpected error occurred."}{" "}
          Try refreshing the page — if the problem persists, contact support.
        </p>

        {/* Error details (collapsible) */}
        {error && (
          <details className="mb-6 text-left rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden">
            <summary className="px-4 py-3 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
              Show error details
            </summary>
            <pre className="px-4 pb-4 text-[11px] text-destructive/80 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={onReset}
            className="rounded-full gap-2"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Try again
          </Button>
          <Button
            variant="ghost"
            onClick={() => { window.location.href = "/"; }}
            className="rounded-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <Home className="w-3.5 h-3.5" />
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline (section-level) fallback ─────────────────────────────────────────

function InlineErrorFallback({
  error,
  onReset,
  context,
}: {
  error: Error | null;
  onReset: () => void;
  context?: string;
}) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex flex-col items-center text-center gap-3">
      <AlertTriangle className="w-6 h-6 text-destructive/70" />
      <div>
        <p className="text-sm font-medium text-foreground mb-1">
          {context ? `${context} failed to load` : "This section failed to load"}
        </p>
        <p className="text-xs text-muted-foreground">
          {error?.message ?? "An unexpected error occurred."}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onReset} className="rounded-full gap-1.5 text-xs h-7">
        <RefreshCcw className="w-3 h-3" />
        Retry
      </Button>
    </div>
  );
}
