// Vercel Node.js serverless function: GET /api/exchange-rate?from=INR&to=USD
//
// Proxies api.frankfurter.app server-side so the browser never calls it
// directly (that upstream doesn't send CORS headers for arbitrary origins,
// which is what was breaking this in production).
//
// Deliberately typed against plain Node http primitives (no @vercel/node
// dependency) so this has no effect on the Vite app's own type-check/build.
import type { IncomingMessage, ServerResponse } from "node:http";

const CURRENCY_CODE_RE = /^[A-Za-z]{3}$/;
const UPSTREAM_TIMEOUT_MS = 5000;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();

  if (!CURRENCY_CODE_RE.test(from) || !CURRENCY_CODE_RE.test(to)) {
    sendJson(res, 400, {
      error: "Invalid currency code. `from` and `to` must each be exactly 3 letters, e.g. from=INR&to=USD.",
    });
    return;
  }

  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `https://api.frankfurter.app/latest?from=${fromCode}&to=${toCode}`,
      { signal: controller.signal },
    );

    if (!upstream.ok) {
      sendJson(res, 502, { error: "Exchange rate provider is currently unavailable." });
      return;
    }

    const data = (await upstream.json()) as { rates?: Record<string, number>; date?: string };
    const rate = data.rates?.[toCode];

    if (typeof rate !== "number" || !Number.isFinite(rate)) {
      sendJson(res, 502, { error: "Exchange rate provider returned an unexpected response." });
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    // Frankfurter publishes daily rates — a short CDN cache is plenty fresh
    // and keeps us from hammering the upstream on every page load.
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
    res.end(JSON.stringify({
      from: fromCode,
      to: toCode,
      rate,
      source: "frankfurter",
      date: data.date ?? null,
    }));
  } catch {
    // Covers network failures and the abort-on-timeout case alike; never
    // leak upstream error internals to the client.
    sendJson(res, 504, { error: "Exchange rate request timed out or failed." });
  } finally {
    clearTimeout(timeout);
  }
}
