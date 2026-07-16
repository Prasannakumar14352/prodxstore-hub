import { useState } from "react";
import { useQuery, useMutation } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import type { Doc, Id } from "@/lib/api/types.ts";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "@/lib/api/values.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type CouponForm = {
  code: string;
  discountType: "percent" | "flat";
  discountValue: string;
  usageLimit: string;
  expiresAt: string;
  minOrderValue: string;
  enabled: boolean;
};

const EMPTY_FORM: CouponForm = {
  code: "",
  discountType: "percent",
  discountValue: "",
  usageLimit: "",
  expiresAt: "",
  minOrderValue: "",
  enabled: true,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(error?: boolean) {
  return cn(
    "h-9 rounded-lg border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/40 transition-colors",
    error ? "border-destructive" : "border-white/10"
  );
}

// ── Coupon row ───────────────────────────────────────────────────────────────

function CouponRow({
  coupon,
  onEdit,
  onDelete,
  onToggle,
}: {
  coupon: Doc<"coupons">;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
  const isExhausted = coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-background/50">
      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Tag className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-sm text-foreground tracking-wider">{coupon.code}</span>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border font-medium",
            coupon.discountType === "percent"
              ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          )}>
            {coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `₹${coupon.discountValue} off`}
          </span>
          {(isExpired || isExhausted) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 font-medium">
              {isExpired ? "Expired" : "Exhausted"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground">
            Used {coupon.usageCount}{coupon.usageLimit != null ? `/${coupon.usageLimit}` : ""} times
          </span>
          {coupon.expiresAt && (
            <span className="text-[10px] text-muted-foreground">
              Expires {new Date(coupon.expiresAt).toLocaleDateString()}
            </span>
          )}
          {coupon.minOrderValue != null && (
            <span className="text-[10px] text-muted-foreground">
              Min ₹{coupon.minOrderValue}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onToggle}
        className="cursor-pointer shrink-0"
        title={coupon.enabled ? "Disable" : "Enable"}
      >
        {coupon.enabled
          ? <ToggleRight className="w-7 h-7 text-primary" />
          : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
      </button>
      <button onClick={onEdit} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0">
        <Pencil className="w-3 h-3" />
      </button>
      <button onClick={onDelete} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Coupon form ──────────────────────────────────────────────────────────────

function CouponFormPanel({
  initial,
  onClose,
}: {
  initial?: Doc<"coupons">;
  onClose: () => void;
}) {
  const upsert = useMutation(api.coupons.upsert);
  const [form, setForm] = useState<CouponForm>(
    initial
      ? {
          code: initial.code,
          discountType: initial.discountType,
          discountValue: String(initial.discountValue),
          usageLimit: initial.usageLimit != null ? String(initial.usageLimit) : "",
          expiresAt: initial.expiresAt
            ? new Date(initial.expiresAt).toISOString().slice(0, 10)
            : "",
          minOrderValue: initial.minOrderValue != null ? String(initial.minOrderValue) : "",
          enabled: initial.enabled,
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CouponForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Partial<Record<keyof CouponForm, string>> = {};
    if (!form.code.trim()) e.code = "Code is required";
    if (!form.discountValue || isNaN(Number(form.discountValue)) || Number(form.discountValue) <= 0) {
      e.discountValue = "Enter a valid discount value";
    }
    if (form.discountType === "percent" && Number(form.discountValue) > 100) {
      e.discountValue = "Percentage cannot exceed 100";
    }
    if (form.usageLimit && (isNaN(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) {
      e.usageLimit = "Must be a positive number";
    }
    if (form.minOrderValue && (isNaN(Number(form.minOrderValue)) || Number(form.minOrderValue) < 0)) {
      e.minOrderValue = "Must be 0 or greater";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await upsert({
        id: initial?._id as Id<"coupons"> | undefined,
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt + "T23:59:59Z").toISOString() : undefined,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        enabled: form.enabled,
      });
      toast.success(initial ? "Coupon updated" : "Coupon created");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string };
        toast.error(data.message ?? "Failed to save coupon");
      } else {
        toast.error("Failed to save coupon");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
        {initial ? "Edit coupon" : "New coupon"}
      </p>

      {/* Code + type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Coupon Code *</label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="e.g. SAVE20"
            className={inputCls(!!errors.code)}
          />
          {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Discount Type *</label>
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value as "percent" | "flat" })}
            className="w-full h-9 rounded-lg border border-white/10 bg-background text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="percent">% Off (percentage)</option>
            <option value="flat">₹ Off (flat amount)</option>
          </select>
        </div>
      </div>

      {/* Value + usage limit */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            {form.discountType === "percent" ? "Percentage Off *" : "Amount Off (₹) *"}
          </label>
          <Input
            type="number"
            min={1}
            max={form.discountType === "percent" ? 100 : undefined}
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            placeholder={form.discountType === "percent" ? "e.g. 20" : "e.g. 200"}
            className={inputCls(!!errors.discountValue)}
          />
          {errors.discountValue && <p className="text-[11px] text-destructive">{errors.discountValue}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            Usage Limit <span className="text-muted-foreground/50">(blank = unlimited)</span>
          </label>
          <Input
            type="number"
            min={1}
            value={form.usageLimit}
            onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            placeholder="e.g. 100"
            className={inputCls(!!errors.usageLimit)}
          />
          {errors.usageLimit && <p className="text-[11px] text-destructive">{errors.usageLimit}</p>}
        </div>
      </div>

      {/* Expiry + min order */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            Expiry Date <span className="text-muted-foreground/50">(optional)</span>
          </label>
          <Input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className={inputCls()}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            Min. Order Value ₹ <span className="text-muted-foreground/50">(optional)</span>
          </label>
          <Input
            type="number"
            min={0}
            value={form.minOrderValue}
            onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
            placeholder="e.g. 500"
            className={inputCls(!!errors.minOrderValue)}
          />
          {errors.minOrderValue && <p className="text-[11px] text-destructive">{errors.minOrderValue}</p>}
        </div>
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setForm({ ...form, enabled: !form.enabled })} className="cursor-pointer">
          {form.enabled
            ? <ToggleRight className="w-8 h-8 text-primary" />
            : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
        </button>
        <span className="text-xs text-muted-foreground">{form.enabled ? "Active" : "Disabled"}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={onClose}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button type="button" size="sm" className="rounded-full gap-1.5" onClick={handleSave} disabled={saving}>
          {saving
            ? <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          {initial ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

// ── Main tab ─────────────────────────────────────────────────────────────────

export default function CouponsTab() {
  const coupons = useQuery(api.coupons.list, {});
  const toggleEnabled = useMutation(api.coupons.toggleEnabled);
  const remove = useMutation(api.coupons.remove);

  const [showForm, setShowForm] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Doc<"coupons"> | null>(null);

  const handleDelete = async (id: Id<"coupons">) => {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    try {
      await remove({ id });
      toast.success("Coupon deleted");
    } catch {
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggle = async (id: Id<"coupons">) => {
    try {
      await toggleEnabled({ id });
    } catch {
      toast.error("Failed to update coupon");
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Coupon Codes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Create and manage discount codes for buyers</p>
        </div>
        <Button
          size="sm"
          className="rounded-full gap-1.5 shrink-0"
          onClick={() => { setShowForm(true); setEditCoupon(null); }}
        >
          <Plus className="w-3.5 h-3.5" /> New coupon
        </Button>
      </div>

      {/* Form */}
      {(showForm || editCoupon) && (
        <CouponFormPanel
          initial={editCoupon ?? undefined}
          onClose={() => { setShowForm(false); setEditCoupon(null); }}
        />
      )}

      {/* List */}
      {coupons === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No coupons yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create a coupon to offer discounts to buyers</p>
          <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Create first coupon
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <CouponRow
              key={c._id}
              coupon={c}
              onEdit={() => { setEditCoupon(c); setShowForm(false); }}
              onDelete={() => handleDelete(c._id)}
              onToggle={() => handleToggle(c._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
