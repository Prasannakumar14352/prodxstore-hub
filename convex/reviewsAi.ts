"use node";
// Node.js runtime — AI polish for reviews (grammar, headline, spam detection, category)

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdminAction } from "./users";
import OpenAI from "openai";

function getOpenAI() {
  const apiKey = process.env.HERCULES_API_KEY;
  if (!apiKey) throw new ConvexError({ code: "BAD_REQUEST", message: "AI gateway not configured." });
  return new OpenAI({
    baseURL: "https://ai-gateway.hercules.app/v1",
    apiKey,
  });
}

type PolishResult = {
  aiTitle: string;
  aiBody: string;
  aiCategory: string;
  aiSpamScore: number;
};

export const polishReview = action({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args): Promise<PolishResult> => {
    await requireAdminAction(ctx);

    // Check if AI polish is enabled
    const aiEnabled = await ctx.runQuery(internal.settings.getAiPolishEnabled, {});
    if (!aiEnabled) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "AI polish is disabled in Review Settings." });
    }

    const review = await ctx.runQuery(internal.reviews.getForAi, { reviewId: args.reviewId });
    if (!review) throw new ConvexError({ code: "NOT_FOUND", message: "Review not found." });

    const openai = getOpenAI();

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

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: Partial<PolishResult>;
    try {
      parsed = JSON.parse(raw) as Partial<PolishResult>;
    } catch {
      parsed = {};
    }

    const result: PolishResult = {
      aiTitle: typeof parsed.aiTitle === "string" ? parsed.aiTitle.slice(0, 120) : (review.title ?? ""),
      aiBody: typeof parsed.aiBody === "string" ? parsed.aiBody.slice(0, 2000) : review.body,
      aiCategory: typeof parsed.aiCategory === "string" ? parsed.aiCategory : "General",
      aiSpamScore: typeof parsed.aiSpamScore === "number" ? Math.max(0, Math.min(1, parsed.aiSpamScore)) : 0,
    };

    await ctx.runMutation(internal.reviews.saveAiPolish, {
      reviewId: args.reviewId,
      ...result,
    });

    return result;
  },
});
