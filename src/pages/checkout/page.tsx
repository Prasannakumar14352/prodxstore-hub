import { motion, AnimatePresence } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Check,
  Zap,
  Lock,
  Minus,
  Plus,
  Tag,
  ChevronRight,
  Download,
  Package,
  Mail,
  Star,
  Loader2,
  X,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart.tsx";
import { getVisuals } from "@/lib/product-visuals.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";
import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";
import { useState } from "react";
import { toast } from "sonner";
import { useAction, useConvex, useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import TrustBadges from "@/components/trust-badges.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "cart" | "details" | "confirm";

type FormData = {
  name: string;
  email: string;
  mobile: string;
};

// Applied coupon state
type AppliedCoupon = {
  code: string;
  discountType: "percent" | "flat";
  discountValue: number;
  discountAmountInr: number;
  message: string;
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "cart", label: "Cart" },
    { id: "details", label: "Details" },
    { id: "confirm", label: "Confirm" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0",
                i < currentIdx
                  ? "bg-primary text-primary-foreground"
                  : i === currentIdx
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-white/8 text-muted-foreground"
              )}
            >
              {i < currentIdx ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs transition-colors",
                i === currentIdx ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Cart step ────────────────────────────────────────────────────────────────

function CartStep({
  onNext,
  promoCode,
  setPromoCode,
  appliedCoupon,
  onApply,
  onApplyCode,
  onClear,
  validating,
}: {
  onNext: () => void;
  promoCode: string;
  setPromoCode: (v: string) => void;
  appliedCoupon: AppliedCoupon | null;
  onApply: () => void;
  onApplyCode: (code: string) => void;
  onClear: () => void;
  validating: boolean;
}) {
  const { items, removeItem, updateQuantity, subtotal, savings } = useCart();
  const { formatUsd } = useExchangeRate();
  const discountInr = appliedCoupon?.discountAmountInr ?? 0;
  const finalTotal = subtotal - discountInr;
  const availableCoupons = useQuery(api.coupons.listActive, {});

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground mb-4">Your cart is empty.</p>
        <Button asChild className="rounded-full">
          <Link to="/">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Items */}
      <div className="lg:col-span-3 space-y-4">
        <h2 className="font-semibold text-base text-foreground">
          {items.length} {items.length === 1 ? "item" : "items"} in your cart
        </h2>

        <div className="space-y-3">
          {items.map((item, i) => {
            const { icon: Icon, gradient, accentColor } = getVisuals(item.product.category);
            return (
              <motion.div
                key={item.product._id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" as const }}
                className="flex gap-4 p-4 rounded-2xl border border-white/8 bg-card"
              >
                <Link to={`/product/${item.product.slug}`} className="shrink-0">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className={cn("absolute inset-0 bg-gradient-to-t opacity-60", gradient)} />
                    <div className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-lg bg-black/50 flex items-center justify-center">
                      <Icon className={cn("w-3 h-3", accentColor)} />
                    </div>
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.product.category}</p>
                  <Link to={`/product/${item.product.slug}`}>
                    <p className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                      {item.product.name}
                    </p>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">{item.product.tagline}</p>

                  <div className="flex items-center gap-3">
                    {/* Quantity */}
                    <div className="flex items-center gap-1 border border-white/10 rounded-full px-1">
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.product._id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground">{formatUsd(item.product.price * item.quantity)}</p>
                  {item.quantity === 1 && (
                    <p className="text-xs text-muted-foreground line-through">{formatUsd(item.product.originalPrice)}</p>
                  )}
                  <p className="text-[10px] text-emerald-400 mt-0.5">
                    Save {formatUsd((item.product.originalPrice - item.product.price) * item.quantity)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Coupon code */}
        <div className="rounded-2xl border border-white/8 bg-card p-4">
          <p className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" /> Coupon code
          </p>

          {/* Available coupons as one-click chips */}
          {!appliedCoupon && availableCoupons && availableCoupons.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] text-muted-foreground mb-2">Available offers — tap to apply:</p>
              <div className="flex flex-wrap gap-2">
                {availableCoupons.map((c: { _id: string; code: string; discountType: string; discountValue: number; minOrderValue?: number }) => (
                  <button
                    key={c._id}
                    onClick={() => onApplyCode(c.code)}
                    disabled={validating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/8 hover:bg-primary/15 transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-mono font-semibold text-primary">{c.code}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.discountType === "percent" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                    </span>
                    {c.minOrderValue && (
                      <span className="text-[10px] text-muted-foreground/60">min ₹{c.minOrderValue}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {appliedCoupon ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300 font-mono">{appliedCoupon.code}</p>
                  <p className="text-xs text-emerald-400/80">{appliedCoupon.message}</p>
                </div>
              </div>
              <button
                onClick={onClear}
                className="text-emerald-400/60 hover:text-emerald-300 transition-colors cursor-pointer"
                title="Remove coupon"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="bg-background/60 border-white/10 rounded-xl h-10 text-sm flex-1 font-mono tracking-wider"
                onKeyDown={(e) => { if (e.key === "Enter") onApply(); }}
                disabled={validating}
              />
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl shrink-0 h-10 px-4 gap-1.5"
                onClick={onApply}
                disabled={validating || !promoCode.trim()}
              >
                {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <div className="sticky top-24 rounded-2xl border border-white/8 bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Order summary</h2>

          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product._id} className="flex justify-between text-muted-foreground">
                <span className="truncate mr-2">
                  {item.product.name}{item.quantity > 1 && ` ×${item.quantity}`}
                </span>
                <span className="shrink-0">{formatUsd(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/8 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Original price</span>
              <span>{formatUsd(items.reduce((s, i) => s + i.product.originalPrice * i.quantity, 0))}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Product savings</span>
                <span>−{formatUsd(savings)}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex justify-between text-emerald-400">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>−{formatUsd(appliedCoupon.discountAmountInr)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-lg pt-2 border-t border-white/8 mt-2">
              <span>Total</span>
              <span>{formatUsd(finalTotal)}</span>
            </div>
          </div>

          <Button size="lg" className="w-full rounded-full gap-2" onClick={onNext}>
            Continue to details <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" /> Secure SSL checkout
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Details step ─────────────────────────────────────────────────────────────

function DetailsStep({
  form,
  setForm,
  onBack,
  onNext,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const update = (key: keyof FormData, value: string) => {
    setForm({ ...form, [key]: value });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 space-y-5">
        <h2 className="font-semibold text-base text-foreground">Your details</h2>

        {/* Contact */}
        <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Contact info</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Full name *</Label>
              <Input
                placeholder="John Smith"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={cn("bg-background/60 border-white/10 rounded-xl h-11", errors.name && "border-destructive")}
              />
              {errors.name && <p className="text-[11px] text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email address *</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={cn("bg-background/60 border-white/10 rounded-xl h-11", errors.email && "border-destructive")}
              />
              {errors.email && <p className="text-[11px] text-destructive mt-1">{errors.email}</p>}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile number <span className="text-muted-foreground/50">(optional)</span></Label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value)}
              className="bg-background/60 border-white/10 rounded-xl h-11"
            />
          </div>
          <p className="text-xs text-muted-foreground">Your download links will be sent to this email after successful payment.</p>
        </div>

        {/* Payment info */}
        <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Payment</p>
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              You'll complete payment securely via <span className="text-foreground font-medium">Razorpay</span> — cards, UPI, net banking & wallets accepted.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="rounded-full gap-2 flex-1" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Back to cart
          </Button>
          <Button className="rounded-full gap-2 flex-1" onClick={handleNext}>
            Review order <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mini summary */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <OrderSummaryCard />
      </motion.div>
    </div>
  );
}

// ─── Confirm step ─────────────────────────────────────────────────────────────

function ConfirmStep({
  form,
  appliedCoupon,
  onBack,
  onPlace,
  loading,
}: {
  form: FormData;
  appliedCoupon: AppliedCoupon | null;
  onBack: () => void;
  onPlace: () => void;
  loading: boolean;
}) {
  const { items, subtotal, savings } = useCart();
  const { formatUsd } = useExchangeRate();
  const discountInr = appliedCoupon?.discountAmountInr ?? 0;
  const finalTotal = subtotal - discountInr;

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 space-y-5">
        <h2 className="font-semibold text-base text-foreground">Review & confirm</h2>

        {/* Contact review */}
        <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Contact</p>
            <button onClick={onBack} className="text-xs text-primary hover:underline cursor-pointer">Edit</button>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{form.name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {form.email}
            </p>
          </div>
        </div>

        {/* Payment review */}
        <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Payment</p>
          </div>
          <p className="text-sm text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Razorpay secure checkout
          </p>
        </div>

        {/* Items review */}
        <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
          {items.map((item) => {
            const { icon: Icon, gradient, accentColor } = getVisuals(item.product.category);
            return (
              <div key={item.product._id} className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  <div className={cn("absolute inset-0 bg-gradient-to-t opacity-60", gradient)} />
                  <div className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded-md bg-black/50 flex items-center justify-center">
                    <Icon className={cn("w-2.5 h-2.5", accentColor)} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.product.category}</p>
                </div>
                <p className="font-bold text-sm text-foreground shrink-0">
                  {formatUsd(item.product.price * item.quantity)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="rounded-full gap-2 flex-1" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button className="rounded-full gap-2 flex-1" onClick={onPlace} disabled={loading}>
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Pay ₹{finalTotal} via Razorpay
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By placing your order you agree to our{" "}
          <a href="#" className="underline hover:text-foreground">Terms of Service</a> and{" "}
          <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <div className="sticky top-24 rounded-2xl border border-white/8 bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Order total</h2>
          <div className="space-y-1.5 text-sm">
            {items.map((item) => (
              <div key={item.product._id} className="flex justify-between text-muted-foreground">
                <span className="truncate mr-2">{item.product.name}</span>
                <span className="shrink-0">{formatUsd(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 pt-3 space-y-1.5 text-sm">
            {savings > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Product discount</span>
                <span>−{formatUsd(savings)}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex justify-between text-emerald-400">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>−{formatUsd(appliedCoupon.discountAmountInr)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-xl pt-2 border-t border-white/8 mt-2">
              <span>Total</span>
              <span>{formatUsd(finalTotal)}</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground pt-1">
            {[
              "Instant delivery via email",
              "Lifetime access & updates",
              "Commercial license included",
            ].map((l) => (
              <div key={l} className="flex items-center gap-2">
                <Check className="w-3 h-3 text-primary shrink-0" /> {l}
              </div>
            ))}
          </div>

          {/* Dynamic trust badges */}
          <TrustBadges variant="checkout" className="mt-2" />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Shared mini order summary ─────────────────────────────────────────────────

function OrderSummaryCard() {
  const { items, subtotal, savings } = useCart();
  const { formatUsd } = useExchangeRate();
  return (
    <div className="sticky top-24 rounded-2xl border border-white/8 bg-card p-6 space-y-4">
      <h2 className="font-semibold text-base">Order summary</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const { icon: Icon, gradient, accentColor } = getVisuals(item.product.category);
          return (
            <div key={item.product._id} className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                <div className={cn("absolute inset-0 bg-gradient-to-t opacity-60", gradient)} />
                <div className="absolute bottom-0.5 left-0.5 w-4 h-4 rounded-md bg-black/50 flex items-center justify-center">
                  <Icon className={cn("w-2 h-2", accentColor)} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.product.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatUsd(item.product.price)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/8 pt-3 space-y-1.5 text-sm">
        {savings > 0 && (
          <div className="flex justify-between text-emerald-400 text-xs">
            <span>You save</span>
            <span>−{formatUsd(savings)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-foreground">
          <span>Subtotal</span>
          <span>{formatUsd(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  name,
  email,
  items,
  total,
}: {
  name: string;
  email: string;
  items: { name: string; price: number }[];
  total: number;
}) {
  const navigate = useNavigate();
  const { formatUsd } = useExchangeRate();
  const orderId = `DGT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      {/* Animated check */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" as const, stiffness: 200, damping: 18, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-6"
      >
        <Check className="w-9 h-9 text-emerald-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
      >
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-2">Order confirmed</p>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Thank you, <span className="font-serif italic font-normal text-primary">{name.split(" ")[0]}!</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your order <strong className="text-foreground">{orderId}</strong> is confirmed. Download links have been sent to{" "}
          <strong className="text-foreground">{email}</strong>.
        </p>

        {/* Receipt card */}
        <div className="rounded-2xl border border-white/8 bg-card p-5 text-left mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Order #{orderId}</p>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span className="text-foreground">{item.name}</span>
                <span className="text-muted-foreground">{formatUsd(item.price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 pt-3 flex justify-between font-bold text-foreground">
            <span>Total paid</span>
            <span>{formatUsd(total)}</span>
          </div>
        </div>

        {/* What's next */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Mail, label: "Check email", desc: "Links sent instantly" },
            { icon: Download, label: "Download", desc: "All files included" },
            { icon: Package, label: "Lifetime access", desc: "Always yours" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border border-white/8 bg-card/50 p-3 text-center">
              <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Rating prompt */}
        <div className="rounded-2xl border border-white/8 bg-card p-4 mb-6">
          <p className="text-sm font-medium text-foreground mb-2">Enjoying your products?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className="cursor-pointer hover:scale-110 transition-transform"
                onClick={() => toast.success("Thanks for the rating!")}
              >
                <Star className="w-6 h-6 text-amber-400/40 hover:text-amber-400 hover:fill-amber-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button className="rounded-full px-8" onClick={() => navigate("/")}>
            Back to store
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Need help? Email us at{" "}
          <a href="mailto:support@digitals.co" className="text-primary hover:underline">
            support@digitals.co
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Razorpay types for the global window object
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-sdk")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { formatUsd } = useExchangeRate();
  const convexClient = useConvex();

  const createOrder = useAction(api.razorpay.createOrder);
  const verifyPayment = useAction(api.razorpay.verifyPayment);

  const [step, setStep] = useState<Step>("cart");
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    mobile: "",
  });

  const discountInr = appliedCoupon?.discountAmountInr ?? 0;
  const finalTotal = subtotal - discountInr;

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? promoCode).trim();
    if (!code) return;
    setValidating(true);
    try {
      const result = await convexClient.query(api.coupons.validate, {
        code,
        cartTotalInr: subtotal,
      });
      if (result.valid) {
        setAppliedCoupon({
          code: code.toUpperCase(),
          discountType: result.discountType,
          discountValue: result.discountValue,
          discountAmountInr: result.discountAmountInr,
          message: result.message,
        });
        setPromoCode(code.toUpperCase());
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to validate coupon. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load Razorpay. Please check your connection.");
        setLoading(false);
        return;
      }

      // 2. Create order on backend
      const affiliateCode = sessionStorage.getItem("pxs_affiliate_code") ?? undefined;
      const orderData = await createOrder({
        customerName: form.name,
        customerEmail: form.email,
        customerMobile: form.mobile || undefined,
        items: items.map((i) => ({
          productId: i.product._id,
          productName: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
        })),
        promoCode: appliedCoupon?.code || undefined,
        promoDiscount: appliedCoupon
          ? (appliedCoupon.discountType === "percent" ? appliedCoupon.discountValue : undefined)
          : undefined,
        finalAmountRupees: finalTotal,
        affiliateCode,
      });

      // 3. Open Razorpay popup
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ProdXStore",
        description: `${items.length} item${items.length > 1 ? "s" : ""}`,
        order_id: orderData.orderId,
        prefill: { name: form.name, email: form.email },
        theme: { color: "#d97706" },
        handler: async (response: RazorpayResponse) => {
          // 4. Verify payment server-side
          try {
            const verification = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            clearCart();
            navigate(`/thank-you/${verification.token}`);
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast("Payment cancelled.");
          },
        },
      });

      rzp.open();
    } catch (err) {
      setLoading(false);
      const isConvexError = err instanceof Error && err.message.includes("credentials are not configured");
      if (isConvexError) {
        toast.error("Razorpay is not configured yet. Please add your API keys in Secrets.");
      } else {
        toast.error("Failed to initiate payment. Please try again.");
      }
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/5 backdrop-blur-xl bg-background/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => (step === "cart" ? navigate(-1) : setStep(step === "details" ? "cart" : "details"))}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <StepIndicator current={step} />
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Secure checkout</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-24">
        <AnimatePresence mode="wait">
          {step === "cart" && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <CartStep
                onNext={() => setStep("details")}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                appliedCoupon={appliedCoupon}
                onApply={handleApplyCoupon}
                onApplyCode={(code) => handleApplyCoupon(code)}
                onClear={() => { setAppliedCoupon(null); setPromoCode(""); }}
                validating={validating}
              />
            </motion.div>
          )}
          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <DetailsStep
                form={form}
                setForm={setForm}
                onBack={() => setStep("cart")}
                onNext={() => setStep("confirm")}
              />
            </motion.div>
          )}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <ConfirmStep
                form={form}
                appliedCoupon={appliedCoupon}
                onBack={() => setStep("details")}
                onPlace={handlePlaceOrder}
                loading={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
