
// Stub for the former convex/aiTestimonialsGen.ts → generateForProduct.
//
// The original feature generated fictional customer reviews, WhatsApp chats,
// and success emails with fabricated earnings, shown to shoppers as real
// social proof. Fabricated reviews are prohibited under India's Consumer
// Protection Act, 2019 (and the CCPA's 2023 guidelines on fake reviews), so
// this generator was intentionally not ported during the Supabase migration.
//
// Existing testimonials in the ai_testimonials table continue to display and
// can be managed (hidden/deleted) from the admin panel. Real customer reviews
// collected via the review-request email flow are a compliant replacement.
import { corsHeaders, json } from "../_shared/utils.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return json({
    error:
      "Testimonial generation is disabled: fabricated customer testimonials are " +
      "prohibited under consumer-protection law. Collect real reviews via the " +
      "automated review-request emails instead.",
  }, 400);
});
