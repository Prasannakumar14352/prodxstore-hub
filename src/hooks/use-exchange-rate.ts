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
  const res = await fetch("https://api.frankfurter.app/latest?from=INR&to=USD");
  if (!res.ok) throw new Error("Rate API error");
  const data = await res.json() as { rates: { USD: number } };
  return data.rates.USD;
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
