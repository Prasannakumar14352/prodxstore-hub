import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";
import ReviewForm from "./_components/review-form.tsx";
import UpsellSection from "./_components/upsell-section.tsx";
import {
  Check,
  Download,
  ExternalLink,
  Mail,
  Package,
  Copy,
  FileText,
  GitBranch,
  Globe,
  BookOpen,
  Key,
  Code2,
  Video,
  Users,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ─── Delivery type icon map ───────────────────────────────────────────────────

const DELIVERY_ICONS: Record<string, React.ElementType> = {
  "File Upload": Download,
  ZIP: Folder,
  PDF: FileText,
  "Google Drive": ExternalLink,
  Dropbox: ExternalLink,
  OneDrive: ExternalLink,
  Mega: ExternalLink,
  Canva: ExternalLink,
  GitHub: GitBranch,
  "External URL": Globe,
  "Course URL": Video,
  "Membership URL": Users,
  "License Key": Key,
  "Source Code": Code2,
  Instructions: BookOpen,
};

const DELIVERY_COLORS: Record<string, string> = {
  "Google Drive": "text-blue-400",
  GitHub: "text-gray-300",
  PDF: "text-red-400",
  ZIP: "text-amber-400",
  Canva: "text-violet-400",
  "License Key": "text-emerald-400",
  "Source Code": "text-cyan-400",
  "Course URL": "text-pink-400",
  "Membership URL": "text-indigo-400",
};

type DeliveryAsset = {
  _id: string;
  name: string;
  deliveryType: string;
  url: string;
  fileName?: string;
  storageId?: string;
  instructions?: string;
  displayOrder: number;
  enabled: boolean;
};

function AssetCard({ asset, index }: { asset: DeliveryAsset; index: number }) {
  const Icon = DELIVERY_ICONS[asset.deliveryType] ?? Globe;
  const iconColor = DELIVERY_COLORS[asset.deliveryType] ?? "text-primary";

  const isLicenseKey = asset.deliveryType === "License Key";

  const handleCopy = () => {
    navigator.clipboard.writeText(asset.url);
    toast.success("Copied to clipboard!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: "easeOut" as const }}
      className="rounded-2xl border border-white/8 bg-card p-5 flex items-start gap-4"
    >
      <div className={cn("w-10 h-10 rounded-xl border border-white/10 bg-background flex items-center justify-center shrink-0")}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm mb-0.5">{asset.name}</p>
        <p className="text-xs text-muted-foreground mb-2">{asset.deliveryType}</p>
        {asset.instructions && (
          <p className="text-xs text-muted-foreground/80 mb-3 leading-relaxed">{asset.instructions}</p>
        )}
        {isLicenseKey ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background border border-white/8 rounded-lg px-3 py-2 font-mono text-emerald-400 truncate">
              {asset.url}
            </code>
            <button
              onClick={handleCopy}
              className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <a
            href={asset.url}
            target={asset.storageId ? "_self" : "_blank"}
            rel="noopener noreferrer"
            download={asset.storageId ? (asset.fileName ?? asset.name) : undefined}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {asset.storageId
              ? `Download ${asset.fileName ?? asset.name}`
              : (asset.deliveryType.includes("URL") || asset.deliveryType.includes("Drive") || asset.deliveryType === "Canva"
                ? "Open"
                : "Download")
              + " " + asset.name}
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function ThankYouPage() {
  const { token } = useParams<{ token: string }>();
  const result = useQuery(api.orders.getOrderByToken, token ? { token } : "skip");
  const { formatUsd } = useExchangeRate();

  if (result === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="max-w-lg w-full mx-auto px-6 space-y-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-2xl border border-white/8 bg-card flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <h1 className="text-xl font-bold mb-2">Purchase Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">This link may be invalid or expired.</p>
          <Button asChild className="rounded-full">
            <Link to="/access-purchase">Access my purchase</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { order, assetsMap } = result;
  const allAssets = Object.values(assetsMap).flat() as DeliveryAsset[];
  const purchaseDate = new Date(order._creationTime).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-background/60 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="https://hercules-cdn.com/file_3y9pBv81Yd6f6aK28NIgGthc" alt="ProdXStore" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5" /> Payment Verified
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Success hero */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" as const, stiffness: 200, damping: 18 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-5"
          >
            <Check className="w-9 h-9 text-emerald-400" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-widest text-primary font-medium mb-2">Payment Successful</p>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Thank you,{" "}
              <span className="font-serif italic font-normal text-primary">
                {order.customerName.split(" ")[0]}!
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Your purchase has been sent to{" "}
              <strong className="text-foreground">{order.customerEmail}</strong>. You can also download it below.
            </p>
          </motion.div>
        </div>

        {/* Order details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-2xl border border-white/8 bg-card p-6 mb-6"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Order Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Order Number", value: order.orderNumber ?? "—" },
              { label: "Purchase Date", value: purchaseDate },
              { label: "Amount Paid", value: formatUsd(Math.round(order.amountInPaise / 100)) },
              { label: "Status", value: "Paid ✓", green: true },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className={cn("text-sm font-semibold", item.green ? "text-emerald-400" : "text-foreground")}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="rounded-2xl border border-white/8 bg-card p-6 mb-6"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Products Purchased</p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.productId} className="flex justify-between items-center text-sm">
                <span className="text-foreground font-medium">{item.productName}</span>
                <span className="text-muted-foreground">{formatUsd(item.price)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Download assets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Your Downloads ({allAssets.length})
          </p>

          {allAssets.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-card p-8 text-center">
              <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Check your email</p>
              <p className="text-xs text-muted-foreground">
                Your delivery links have been sent to {order.customerEmail}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allAssets.map((asset, i) => (
                <AssetCard key={asset._id} asset={asset} index={i} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Post-purchase upsell */}
        <UpsellSection purchasedProductIds={order.items.map((i) => i.productId)} />

        {/* Review form */}
        <ReviewForm
          orderToken={token ?? ""}
          productIds={order.items.map((i) => i.productId)}
          defaultName={order.customerName}
        />

        {/* Footer notes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-10 text-center space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="rounded-full px-8">
              <Link to="/">Back to store</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-full px-8">
              <Link to="/access-purchase">Access purchases later</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Need help?{" "}
            <a href="mailto:prodxstoresupport@gmail.com" className="text-primary hover:underline">
              prodxstoresupport@gmail.com
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
