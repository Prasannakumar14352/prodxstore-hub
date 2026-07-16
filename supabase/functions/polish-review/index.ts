// Replaces convex/reviewsAi.ts → polishReview.
// Uses any OpenAI-compatible API: set OPENAI_API_KEY (+ optional OPENAI_BASE_URL,
// OPENAI_MODEL). Admin-only: verifies the caller's JWT belongs to an admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, serviceClient } from "../_shared/utils.ts";
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};
async function requireAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return false;
  const db = serviceClient();
  const { data } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" || data?.role === "super_admin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!(await requireAdmin(req))) return json({ error: "Admin access required." }, 403);
    const { reviewId } = await req.json();
    const db = serviceClient();

    const { data: aiRow } = await db.from("settings").select("value")
      .eq("key", "review_ai_polish_enabled").maybeSingle();
    if (aiRow?.value === "false") {
      return json({ error: "AI polish is disabled in Review Settings." }, 400);
    }

    const { data: review } = await db.from("reviews").select("*")
      .eq("id", reviewId).maybeSingle();
    if (!review) return json({ error: "Review not found." }, 404);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured (set OPENAI_API_KEY)." }, 500);
    const baseUrl = (Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    const prompt = `You are a review editor for a digital products store. Analyze and improve this customer review.

ORIGINAL REVIEW:
Title: ${review.title ?? "(none)"}
Body: ${review.body}
Rating: ${review.rating}/5 stars

Return ONLY a valid JSON object with these exact fields:
{
  "aiTitle": "A concise, compelling headline (max 80 chars). Use the original if it's already good.",
  "aiBody": "The review body with grammar/spelling fixed, awkward phrasing smoothed. Keep the reviewer's authentic voice. Do NOT add fake details or change the meaning. If the original is already clean, return it as-is.",
  "aiCategory": "One of: Quality, Value for Money, Ease of Use, Support, Design, Features",
  "aiSpamScore": 0.0
}

For aiSpamScore: 0.0 = clearly genuine, 1.0 = obvious spam/fake. Score >0.5 if: gibberish text, unrelated to digital products, suspiciously promotional with no specifics, or matches known spam patterns.`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      console.error("AI request failed:", await res.text());
      return json({ error: "AI request failed." }, 502);
    }
    const completion = await res.json();
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}"); } catch { /* noop */ }

    const result = {
      aiTitle: typeof parsed.aiTitle === "string" ? parsed.aiTitle.slice(0, 120) : (review.title ?? ""),
      aiBody: typeof parsed.aiBody === "string" ? parsed.aiBody.slice(0, 2000) : review.body,
      aiCategory: typeof parsed.aiCategory === "string" ? parsed.aiCategory : "General",
      aiSpamScore: typeof parsed.aiSpamScore === "number" ? Math.max(0, Math.min(1, parsed.aiSpamScore)) : 0,
    };

    await db.from("reviews").update({
      ai_title: result.aiTitle, ai_body: result.aiBody,
      ai_category: result.aiCategory, ai_spam_score: result.aiSpamScore,
      ai_processed: true,
    }).eq("id", reviewId);

    return json(result);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error." }, 500);
  }
});
