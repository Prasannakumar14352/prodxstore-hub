// Replaces convex/orders.ts → getOrderByToken (thank-you & re-access pages).
// Returns the paid order + delivery assets with signed download URLs.
import { corsHeaders, json, serviceClient, resolveAssets } from "../_shared/utils.ts";
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token) return json({ order: null, assetsMap: {} });

    const db = serviceClient();
    const { data: t } = await db.from("purchase_tokens")
      .select("order_id").eq("token", token).maybeSingle();
    if (!t) return json({ order: null, assetsMap: {} });

    const { data: order } = await db.from("orders").select("*")
      .eq("id", t.order_id).maybeSingle();
    if (!order || order.status !== "paid") return json({ order: null, assetsMap: {} });

    const productIds = [...new Set((order.items as Array<{ productId: string }>)
      .map((i) => i.productId))];
    const assetsMap = await resolveAssets(db, productIds);

    return json({ order, assetsMap });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error." }, 500);
  }
});
