// Drop-in replacements for the hooks the app previously imported from
// "convex/react" and "@convex-dev/auth/react", now backed by Supabase +
// @tanstack/react-query (already a project dependency).

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  useQuery as useRQ,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "./supabase.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type ApiFn = ((args?: any) => Promise<any>) & { _key?: string };

function keyOf(fn: ApiFn): string {
  return fn._key ?? fn.name ?? "anonymous";
}

// ─── useQuery ─────────────────────────────────────────────────────────────────
// Matches Convex semantics: returns `undefined` while loading, supports "skip".
// Data refetches after any mutation (global invalidation) and on an interval,
// approximating Convex's live reactivity.

export function useQuery<F extends ApiFn>(
  fn: F,
  args?: Parameters<F>[0] | "skip" | Record<string, never>,
): Awaited<ReturnType<F>> | undefined {
  const skip = args === "skip";
  const queryArgs = skip ? undefined : args;
  const { data } = useRQ({
    queryKey: [keyOf(fn), JSON.stringify(queryArgs ?? null)],
    queryFn: async () => {
      const result = await fn(queryArgs as Parameters<F>[0]);
      return (result ?? null) as Awaited<ReturnType<F>>;
    },
    enabled: !skip,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  if (skip) return undefined;
  return data as Awaited<ReturnType<F>> | undefined;
}

// ─── useMutation / useAction ──────────────────────────────────────────────────
// Convex's useMutation returns a plain async function. We do the same, and
// invalidate all cached queries afterwards so the UI reflects the write.

export function useMutation<F extends ApiFn>(fn: F): F {
  const queryClient = useQueryClient();
  return useCallback(
    (async (args?: Parameters<F>[0]) => {
      const result = await fn(args as Parameters<F>[0]);
      void queryClient.invalidateQueries();
      return result;
    }) as F,
    [fn, queryClient],
  );
}

export const useAction = useMutation;

// ─── useConvex (imperative client) ────────────────────────────────────────────
// Previously used as `convexClient.query(api.x.y, args)`.

export function useConvex() {
  return {
    query: <F extends ApiFn>(fn: F, args?: Parameters<F>[0]) =>
      fn(args as Parameters<F>[0]) as ReturnType<F>,
    mutation: <F extends ApiFn>(fn: F, args?: Parameters<F>[0]) =>
      fn(args as Parameters<F>[0]) as ReturnType<F>,
    action: <F extends ApiFn>(fn: F, args?: Parameters<F>[0]) =>
      fn(args as Parameters<F>[0]) as ReturnType<F>,
  };
}

// ─── Auth state (replaces useConvexAuth) ─────────────────────────────────────

export function useConvexAuth(): { isAuthenticated: boolean; isLoading: boolean } {
  const [state, setState] = useState<{ isAuthenticated: boolean; isLoading: boolean }>({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState({ isAuthenticated: !!data.session, isLoading: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState({ isAuthenticated: !!session, isLoading: false });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export const useSupabaseAuth = useConvexAuth;

// ─── useAuthActions (replaces @convex-dev/auth/react) ────────────────────────
// Keeps the old call shape: signIn("password", { email, password, flow })

export function useAuthActions() {
  const queryClient = useQueryClient();

  const signIn = useCallback(
    async (
      _provider: string,
      params: { email: string; password: string; flow?: "signIn" | "signUp"; name?: string },
    ) => {
      if (params.flow === "signUp") {
        const { error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: { data: { name: params.name } },
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: params.email,
          password: params.password,
        });
        if (error) throw new Error(error.message);
      }
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    void queryClient.invalidateQueries();
  }, [queryClient]);

  return { signIn, signOut };
}

// ─── <Authenticated> (replaces convex/react's component) ─────────────────────

export function Authenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  return isAuthenticated ? children : null;
}
