import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";
import { cn } from "@/lib/utils.ts";

type PriceTagProps = {
  inr: number;
  className?: string;
  strikethrough?: boolean;
};

/**
 * Displays a price converted from INR to USD using live exchange rate.
 * Falls back to ₹ display while rate is loading or if fetch fails.
 */
export function PriceTag({ inr, className, strikethrough }: PriceTagProps) {
  const { formatUsd } = useExchangeRate();
  return (
    <span className={cn(strikethrough && "line-through", className)}>
      {formatUsd(inr)}
    </span>
  );
}
