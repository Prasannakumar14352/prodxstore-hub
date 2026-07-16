import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * True when a product's "slug" field is actually a full external URL or
 * domain/subdomain (e.g. "kids.prodxstore.com") rather than a normal
 * internal slug (e.g. "printable-learning-bundle").
 */
export function isExternalProductUrl(value?: string | null): boolean {
  if (!value) return false;

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const hostname = withoutProtocol.split("/")[0];

  return (
    hostname.includes(".") &&
    !hostname.startsWith(".") &&
    !hostname.endsWith(".")
  );
}

/** Ensures an external product URL has an explicit https:// (or http://) scheme. */
export function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
