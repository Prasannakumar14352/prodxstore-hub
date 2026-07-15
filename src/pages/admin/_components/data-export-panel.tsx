import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Package,
  Database,
} from "lucide-react";
import Papa from "papaparse";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportData = Awaited<ReturnType<typeof useQuery<typeof api.dataExport.exportAll>>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(rows: object[], filename: string) {
  if (rows.length === 0) {
    toast.error("No data to export");
    return;
  }
  // BOM for Excel UTF-8
  const csv = "\uFEFF" + Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function flattenOrder(order: Record<string, unknown>) {
  return {
    _id: order._id,
    orderNumber: order.orderNumber ?? "",
    date: new Date((order._creationTime as number)).toISOString(),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerMobile: order.customerMobile ?? "",
    items: (order.items as Array<{ productName: string; quantity: number }>)
      .map((i) => `${i.productName}${i.quantity > 1 ? ` x${i.quantity}` : ""}`)
      .join("; "),
    amountInr: Math.round((order.amountInPaise as number) / 100),
    currency: order.currency,
    status: order.status,
    promoCode: order.promoCode ?? "",
    promoDiscount: order.promoDiscount ?? "",
    affiliateCode: order.affiliateCode ?? "",
    emailSent: order.emailSent ? "yes" : "no",
    downloadCount: order.downloadCount ?? 0,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId ?? "",
    internalNotes: order.internalNotes ?? "",
  };
}

function flattenProduct(p: Record<string, unknown>) {
  return {
    _id: p._id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    tagline: p.tagline,
    price: p.price,
    originalPrice: p.originalPrice,
    badge: p.badge ?? "",
    image: p.image,
    features: (p.features as string[]).join("; "),
    whatsIncluded: (p.whatsIncluded as string[]).join("; "),
  };
}

function flattenReview(r: Record<string, unknown>) {
  return {
    _id: r._id,
    productId: r.productId,
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    rating: r.rating,
    title: r.title ?? "",
    body: r.body,
    status: r.status,
    isVerifiedBuyer: r.isVerifiedBuyer ? "yes" : "no",
    isFeatured: r.isFeatured ? "yes" : "no",
    aiTitle: r.aiTitle ?? "",
    aiBody: r.aiBody ?? "",
    aiCategory: r.aiCategory ?? "",
    aiSpamScore: r.aiSpamScore ?? "",
    date: new Date((r._creationTime as number)).toISOString(),
  };
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function DataExportPanelInner() {
  const exportData = useQuery(api.dataExport.exportAll);
  const [exporting, setExporting] = useState(false);

  const isLoading = exportData === undefined;
  const counts = exportData?.counts ?? {};

  const tables: Array<{
    key: keyof NonNullable<ExportData>;
    label: string;
    description: string;
    flattenFn?: (row: Record<string, unknown>) => Record<string, unknown>;
  }> = [
    {
      key: "products",
      label: "Products",
      description: "All product records including prices, categories, and metadata",
      flattenFn: flattenProduct,
    },
    {
      key: "deliveryAssets",
      label: "Delivery Assets",
      description: "Download links and Convex storage references per product",
    },
    {
      key: "orders",
      label: "Orders",
      description: "All orders — created, paid, and failed — with customer details",
      flattenFn: flattenOrder,
    },
    {
      key: "purchaseTokens",
      label: "Purchase Tokens",
      description: "Secure tokens used for thank-you page and re-access links",
    },
    {
      key: "users",
      label: "Users",
      description: "Registered users with roles (tokenIdentifier preserved for OIDC migration)",
    },
    {
      key: "reviews",
      label: "Reviews",
      description: "All customer reviews with AI polish fields and moderation status",
      flattenFn: flattenReview,
    },
    {
      key: "aiTestimonials",
      label: "AI Testimonials",
      description: "Admin-generated testimonial cards (review, WhatsApp, email types)",
    },
    {
      key: "coupons",
      label: "Coupons",
      description: "Discount codes with usage counts and expiry dates",
    },
    {
      key: "affiliates",
      label: "Affiliates",
      description: "Affiliate partners with visit and conversion statistics",
    },
    {
      key: "settings",
      label: "Settings",
      description: "All key-value app configuration (Razorpay keys, review settings, etc.)",
    },
  ];

  function handleExportAllJson() {
    if (!exportData) return;
    setExporting(true);
    try {
      downloadJson(exportData, `prodxstore-full-export-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("Full JSON export downloaded");
    } finally {
      setExporting(false);
    }
  }

  function handleTableJson(key: keyof NonNullable<ExportData>) {
    if (!exportData) return;
    const rows = exportData[key];
    if (!Array.isArray(rows)) return;
    downloadJson(rows, `prodxstore-${key}-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success(`${key} exported as JSON`);
  }

  function handleTableCsv(
    key: keyof NonNullable<ExportData>,
    flattenFn?: (row: Record<string, unknown>) => Record<string, unknown>,
  ) {
    if (!exportData) return;
    const rows = exportData[key];
    if (!Array.isArray(rows) || rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const flat = flattenFn
      ? (rows as Record<string, unknown>[]).map(flattenFn)
      : (rows as Record<string, unknown>[]);
    downloadCsv(flat, `prodxstore-${key}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`${key} exported as CSV`);
  }

  return (
    <div className="rounded-xl border border-white/8 bg-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Export Data</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Download all your Convex database records as JSON or CSV for migration,
            backup, or importing into another project.
          </p>
        </div>
        <Button
          onClick={handleExportAllJson}
          disabled={isLoading || exporting}
          className="shrink-0"
          size="sm"
        >
          <Package className="w-4 h-4 mr-1.5" />
          Export All (JSON)
        </Button>
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([table, count]) => (
            <Badge key={table} variant="secondary" className="text-xs font-mono">
              {table}: {count}
            </Badge>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">Loading export data…</p>
      )}

      {/* Per-table rows */}
      <div className="divide-y divide-white/6">
        {tables.map(({ key, label, description, flattenFn }) => {
          const count = counts[key as string] ?? 0;
          const hasCsv = !!flattenFn;
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <Badge variant="outline" className="text-xs font-mono h-4 px-1">
                    {count}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasCsv && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isLoading || count === 0}
                    onClick={() => handleTableCsv(key, flattenFn)}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    CSV
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isLoading || count === 0}
                  onClick={() => handleTableJson(key)}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <FileJson className="w-3 h-3" />
                  JSON
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Migration note */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
        <div className="flex gap-2">
          <Download className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Migrating to a new Convex project?</p>
            <p className="text-xs text-muted-foreground">
              Export all tables as JSON, then import them in the Convex Dashboard
              (Data tab) or via{" "}
              <code className="font-mono bg-white/6 px-1 rounded">npx convex import</code>.
              See <code className="font-mono bg-white/6 px-1 rounded">docs/MIGRATION.md</code> in
              the codebase for the complete deployment guide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DataExportPanel() {
  return (
    <Authenticated>
      <DataExportPanelInner />
    </Authenticated>
  );
}
