"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://ai-gateway.hercules.app/v1",
  apiKey: process.env.HERCULES_API_KEY,
});

// ─── Generate a batch of testimonials for a product ──────────────────────────

export const generateForProduct = action({
  args: {
    productId: v.id("products"),
    productName: v.string(),
    productSlug: v.string(),
    productDescription: v.string(),
    types: v.array(v.union(v.literal("review"), v.literal("whatsapp"), v.literal("email"))),
    count: v.number(), // how many per type
  },
  handler: async (ctx, args): Promise<{ generated: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    let generated = 0;

    for (const type of args.types) {
      for (let i = 0; i < args.count; i++) {
        const testimonial = await generateOne(type, args.productName, args.productDescription, i);
        await ctx.runMutation(internal.aiTestimonials.saveGenerated, {
          productId: args.productId,
          productName: args.productName,
          productSlug: args.productSlug,
          type,
          ...testimonial,
          displayOrder: Date.now() + i,
        });
        generated++;
      }
    }

    return { generated };
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ReviewData = {
  reviewerName: string;
  reviewerInitials: string;
  reviewerRole: string;
  rating: number;
  reviewTitle: string;
  reviewBody: string;
};

type WhatsAppData = {
  whatsappBuyerName: string;
  whatsappBuyerInitials: string;
  whatsappMessages: Array<{ sender: "buyer" | "seller"; text: string; time: string }>;
};

type EmailData = {
  emailSender: string;
  emailInitials: string;
  emailSubject: string;
  emailBody: string;
};

async function generateOne(
  type: "review" | "whatsapp" | "email",
  productName: string,
  productDescription: string,
  index: number
): Promise<ReviewData | WhatsAppData | EmailData> {
  const indianNames = [
    "Aman Verma", "Priya Singh", "Rohit Sharma", "Neha Gupta", "Suresh Patel",
    "Pooja Mehta", "Karan Kapoor", "Anita Joshi", "Vijay Kumar", "Sneha Reddy",
    "Rajan Nair", "Meera Pillai", "Deepak Malhotra", "Kavya Iyer", "Ashish Yadav",
    "Ritu Agarwal", "Sanjay Desai", "Lakshmi Krishnan", "Manish Tiwari", "Divya Shah",
  ];
  const roles = [
    "Freelancer", "Small Business Owner", "Digital Marketer", "Entrepreneur",
    "Content Creator", "Side Hustle Founder", "Online Seller", "E-commerce Store Owner",
    "Work-from-Home Professional", "Reseller",
  ];

  const name = indianNames[index % indianNames.length];
  const initials = name.split(" ").map((n) => n[0]).join("");
  const role = roles[index % roles.length];

  if (type === "review") {
    const prompt = `You are writing a genuine customer review for an Indian digital products store called ProdXStore.
Product: "${productName}"
Description: "${productDescription}"

Write a realistic, enthusiastic review from an Indian customer named "${name}" who is a "${role}".
The review should mention:
- A specific success or result they got (sales in ₹, profits made, ease of use)
- Why they recommend it to others

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "rating": 5,
  "reviewTitle": "Short catchy headline under 60 chars",
  "reviewBody": "2-3 sentence genuine review in natural conversational English. Mention specific results."
}`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(res.choices[0].message.content ?? "{}") as {
      rating: number;
      reviewTitle: string;
      reviewBody: string;
    };

    return {
      reviewerName: name,
      reviewerInitials: initials,
      reviewerRole: role,
      rating: data.rating ?? 5,
      reviewTitle: data.reviewTitle ?? `Amazing product!`,
      reviewBody: data.reviewBody ?? `Really happy with my purchase.`,
    };
  }

  if (type === "whatsapp") {
    const prompt = `You are simulating a real WhatsApp conversation screenshot for an Indian digital products store called ProdXStore.
Product: "${productName}"
Description: "${productDescription}"

A buyer named "${name}" is messaging the store owner to share their success story.
The conversation should feel natural and authentic, showing a success result (₹ sales, profits).

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "messages": [
    { "sender": "buyer", "text": "Message text here", "time": "4:42 PM" },
    { "sender": "seller", "text": "Reply here", "time": "4:43 PM" },
    { "sender": "buyer", "text": "Follow-up message", "time": "4:44 PM" }
  ]
}

Rules:
- 3-5 messages total
- buyer starts with a success update (mentions ₹ amount)
- seller responds with encouragement
- Times should be consecutive and realistic (afternoon)
- Keep texts short (1-3 lines each)`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(res.choices[0].message.content ?? "{}") as {
      messages: Array<{ sender: string; text: string; time: string }>;
    };

    const validMessages = (data.messages ?? []).map((m) => ({
      sender: (m.sender === "seller" ? "seller" : "buyer") as "buyer" | "seller",
      text: m.text,
      time: m.time,
    }));

    return {
      whatsappBuyerName: name,
      whatsappBuyerInitials: initials,
      whatsappMessages: validMessages,
    };
  }

  // email
  const prompt = `You are writing a genuine success email from a happy customer to the team at ProdXStore.
Product: "${productName}"
Description: "${productDescription}"

The sender is "${name}", a "${role}". They are sharing how the product helped them make money.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "subject": "Email subject line under 80 chars",
  "body": "3-4 paragraph email body. Start with 'Hi Team,' or 'Hi Dear,'. Mention specific ₹ results. End with 'Best regards,\\n${name}'. Keep it warm and genuine."
}`;

  const res = await openai.chat.completions.create({
    model: "openai/gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const data = JSON.parse(res.choices[0].message.content ?? "{}") as {
    subject: string;
    body: string;
  };

  return {
    emailSender: name,
    emailInitials: initials,
    emailSubject: data.subject ?? `Happy with ${productName}`,
    emailBody: data.body ?? `Hi Team,\n\nI'm really happy with my purchase.\n\nBest regards,\n${name}`,
  };
}
