import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";

type ExchangeRateResult = {
  rate: number | null;
  isLoading: boolean;
  /** Converts INR to USD and formats as "$X.XX". Never shows ₹. */
  formatUsd: (inrAmount: number) => string;
};

const HARDCODED_FALLBACK = 0.012; // last-resort if both API and DB fail

async function fetchLiveRate(): Promise<number> {
  // Server-side proxy (api/exchange-rate.ts) — the browser never calls
  // api.frankfurter.app directly, since that upstream doesn't send CORS
  // headers for our production origin.
  const res = await fetch("/api/exchange-rate?from=INR&to=USD");
  if (!res.ok) throw new Error("Rate API error");
  const data = await res.json() as { rate: number };
  if (typeof data.rate !== "number" || !Number.isFinite(data.rate) || data.rate <= 0) {
    throw new Error("Rate API returned an invalid rate");
  }
  return data.rate;
}

export function useExchangeRate(): ExchangeRateResult {
  // 1. Live rate from API (cached 1 hour)
  const { data: liveRate, isLoading: liveLoading } = useTanstackQuery({
    queryKey: ["exchange-rate-inr-usd"],
    queryFn: fetchLiveRate,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  // 2. Admin-configured fallback rate from DB
  const dbFallbackRate = useConvexQuery(api.settings.getFallbackRate);

  const isLoading = liveLoading && dbFallbackRate === undefined;

  // Priority: live rate → admin fallback → hardcoded fallback
  const effectiveRate = liveRate ?? dbFallbackRate ?? HARDCODED_FALLBACK;

  const formatUsd = (inrAmount: number): string => {
    const usd = inrAmount * effectiveRate;
    return `$${usd.toFixed(2)}`;
  };

  return { rate: effectiveRate, isLoading, formatUsd };
}
