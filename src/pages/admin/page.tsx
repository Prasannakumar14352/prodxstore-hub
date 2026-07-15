import { useState, useRef } from "react";
import type React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import type { Doc } from "@/convex/_generated/dataModel";
import type { DbProduct } from "@/lib/product-visuals.ts";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { AiTestimonialsTab } from "./_components/ai-testimonials-tab.tsx";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Package,
  ImageIcon,
  Zap,
  ShoppingBag,
  Mail,
  MailCheck,
  Download,
  Copy,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowUpRight,
  Layers,
  ToggleLeft,
  Sparkles,
  ToggleRight,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  CreditCard,
  Star,
  Loader2,
  AlertTriangle,
  FileUp,
  BarChart2,
  Tag,
  Link2,
  FileDown,
  Filter,
} from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import ImageUploader from "./_components/image-uploader.tsx";
import MultiImageUploader from "./_components/multi-image-uploader.tsx";
import ReviewsTab from "./_components/reviews-tab.tsx";
import AnalyticsTab from "./_components/analytics-tab.tsx";
import CouponsTab from "./_components/coupons-tab.tsx";
import AffiliatesTab from "./_components/affiliates-tab.tsx";
import SocialProofSettingsPanel from "./_components/social-proof-settings-panel.tsx";
import DataExportPanel from "./_components/data-export-panel.tsx";

// ─── Settings Tab ─────────────────────────────────────────────────────────────

// Razorpay test credentials for demo/testing
const DEMO_KEY_ID = "rzp_test_1DP5mmOlF5G5ag";
const DEMO_KEY_SECRET = "thiswillnotwork";

// ─── Review Behaviour Settings panel ─────────────────────────────────────────

function ReviewSettingsPanel() {
  const current = useQuery(api.settings.getReviewSettings);
  const save = useMutation(api.settings.setReviewSettings);

  const [minLength, setMinLength] = useState("");
  const [approvalMode, setApprovalMode] = useState<"manual" | "auto" | null>(null);
  const [aiPolish, setAiPolish] = useState<boolean | null>(null);
  const [showEmpty, setShowEmpty] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveMinLength = minLength !== "" ? parseInt(minLength, 10) : (current?.minLength ?? 20);
  const effectiveApproval = approvalMode ?? (current?.approvalMode ?? "manual");
  const effectiveAiPolish = aiPolish ?? (current?.aiPolishEnabled ?? true);
  const effectiveShowEmpty = showEmpty ?? (current?.showEmptySection ?? true);

  const handleSave = async () => {
    if (isNaN(effectiveMinLength) || effectiveMinLength < 1 || effectiveMinLength > 500) {
      toast.error("Min length must be 1–500 characters");
      return;
    }
    setSaving(true);
    try {
      await save({
        minLength: effectiveMinLength,
        approvalMode: effectiveApproval,
        aiPolishEnabled: effectiveAiPolish,
        showEmptySection: effectiveShowEmpty,
      });
      toast.success("Review settings saved");
      setMinLength("");
      setApprovalMode(null);
      setAiPolish(null);
      setShowEmpty(null);
    } catch {
      toast.error("Failed to save review settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Star className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground">Review Behaviour</h3>
          <p className="text-xs text-muted-foreground">Control how buyer reviews are submitted, moderated, and displayed</p>
        </div>
      </div>

      {/* Approval mode */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">Approval Mode</Label>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Choose whether new reviews require manual approval or are published automatically.
        </p>
        <div className="flex gap-2">
          {(["manual", "auto"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setApprovalMode(mode)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-xs font-medium transition-colors cursor-pointer",
                effectiveApproval === mode
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/10 bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "manual" ? "Manual approval" : "Auto-approve"}
            </button>
          ))}
        </div>
        {effectiveApproval === "auto" && (
          <p className="text-[11px] text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Auto-approve publishes all reviews immediately — consider enabling spam detection.
          </p>
        )}
      </div>

      {/* Min review length */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">Minimum Review Length</Label>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Reviews shorter than this will be rejected at submission. Current:{" "}
          <span className="font-mono text-foreground">{current?.minLength ?? 20}</span> characters.
        </p>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min={1}
            max={500}
            placeholder={String(current?.minLength ?? 20)}
            value={minLength}
            onChange={(e) => setMinLength(e.target.value)}
            className="bg-background border-white/10 text-sm w-28 font-mono"
          />
          <span className="text-xs text-muted-foreground">characters</span>
          <div className="flex gap-1.5 ml-auto">
            {[10, 20, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setMinLength(String(n))}
                className={cn(
                  "w-9 h-7 rounded-md border text-xs transition-colors cursor-pointer",
                  effectiveMinLength === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 text-muted-foreground hover:text-foreground"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Polish toggle */}
      <div className="flex items-center justify-between py-3 border-t border-white/8">
        <div>
          <p className="text-xs font-medium text-foreground">AI Grammar & Polish</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            When enabled, admins can use AI to correct grammar, generate headlines, detect spam, and categorize reviews.
          </p>
        </div>
        <button
          onClick={() => setAiPolish(!effectiveAiPolish)}
          className={cn(
            "relative w-10 h-6 rounded-full border transition-colors cursor-pointer shrink-0 overflow-hidden",
            effectiveAiPolish
              ? "bg-primary border-primary"
              : "bg-white/5 border-white/15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
              effectiveAiPolish ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Show empty section toggle */}
      <div className="flex items-center justify-between py-3 border-t border-white/8">
        <div>
          <p className="text-xs font-medium text-foreground">Show Empty Review Sections</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            When disabled, the reviews section is hidden on product pages that have zero approved reviews.
          </p>
        </div>
        <button
          onClick={() => setShowEmpty(!effectiveShowEmpty)}
          className={cn(
            "relative w-10 h-6 rounded-full border transition-colors cursor-pointer shrink-0 overflow-hidden",
            effectiveShowEmpty
              ? "bg-primary border-primary"
              : "bg-white/5 border-white/15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
              effectiveShowEmpty ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      <Button
        size="sm"
        className="rounded-full px-6 gap-2"
        disabled={saving}
        onClick={handleSave}
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save review settings
      </Button>
    </div>
  );
}

function TrustBadgeSettingsPanel() {
  const current = useQuery(api.settings.getTrustBadgeSettings);
  const save = useMutation(api.settings.setTrustBadgeSettings);

  const [moneyBackDays, setMoneyBackDays] = useState<string>("");
  const [showMoneyBack, setShowMoneyBack] = useState<boolean | null>(null);
  const [showSecureCheckout, setShowSecureCheckout] = useState<boolean | null>(null);
  const [showInstantDelivery, setShowInstantDelivery] = useState<boolean | null>(null);
  const [showBuyerCount, setShowBuyerCount] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveMoneyBack = showMoneyBack ?? current?.showMoneyBack ?? true;
  const effectiveSecure = showSecureCheckout ?? current?.showSecureCheckout ?? true;
  const effectiveDelivery = showInstantDelivery ?? current?.showInstantDelivery ?? true;
  const effectiveBuyerCount = showBuyerCount ?? current?.showBuyerCount ?? true;

  type ToggleItem = { label: string; value: boolean; onChange: (v: boolean) => void };
  const toggles: ToggleItem[] = [
    { label: "Money-back guarantee badge", value: effectiveMoneyBack, onChange: setShowMoneyBack },
    { label: "Secure checkout badge", value: effectiveSecure, onChange: setShowSecureCheckout },
    { label: "Instant delivery badge", value: effectiveDelivery, onChange: setShowInstantDelivery },
    { label: '"X people bought this" counter', value: effectiveBuyerCount, onChange: setShowBuyerCount },
  ];

  return (
    <div className="rounded-xl border border-white/8 bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Trust Badges & Social Proof</h3>
      </div>

      {/* Toggle each badge */}
      <div className="space-y-3">
        {toggles.map(({ label, value, onChange }) => (
          <div key={label} className="flex items-center justify-between py-1">
            <span className="text-sm text-foreground">{label}</span>
            <button
              onClick={() => onChange(!value)}
              className={cn(
                "relative w-10 h-6 rounded-full border transition-colors cursor-pointer shrink-0 overflow-hidden",
                value ? "bg-primary border-primary" : "bg-white/5 border-white/15"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                value ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
        ))}
      </div>

      {/* Money-back days */}
      {effectiveMoneyBack && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Money-back period (days)</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={moneyBackDays}
            onChange={(e) => setMoneyBackDays(e.target.value)}
            placeholder={String(current?.moneyBackDays ?? 30)}
            className="h-8 text-sm w-32"
          />
          <p className="text-[11px] text-muted-foreground">
            Currently: <span className="text-foreground font-medium">{current?.moneyBackDays ?? 30} days</span>. Shown in badges and product pages.
          </p>
        </div>
      )}

      <Button
        size="sm"
        disabled={saving || !current}
        onClick={async () => {
          if (!current) return;
          setSaving(true);
          try {
            const days = moneyBackDays !== "" ? parseInt(moneyBackDays, 10) : (current.moneyBackDays ?? 30);
            await save({
              moneyBackDays: isNaN(days) ? 30 : days,
              showMoneyBack: effectiveMoneyBack,
              showSecureCheckout: effectiveSecure,
              showInstantDelivery: effectiveDelivery,
              showBuyerCount: effectiveBuyerCount,
            });
            toast.success("Trust badge settings saved");
            setMoneyBackDays("");
            setShowMoneyBack(null);
            setShowSecureCheckout(null);
            setShowInstantDelivery(null);
            setShowBuyerCount(null);
          } catch {
            toast.error("Failed to save");
          } finally {
            setSaving(false);
          }
        }}
        className="gap-2"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save trust settings
      </Button>

      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pt-1 border-t border-white/8">
        <li>Badges appear on product pages and the checkout confirm step</li>
        <li>Buyer count adds 47 to actual orders to appear established from day one</li>
      </ul>
    </div>
  );
}

function SettingsTab() {
  // Currency settings
  const currentRate = useQuery(api.settings.getFallbackRate);
  const setFallbackRate = useMutation(api.settings.setFallbackRate);
  const [rateInput, setRateInput] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  // Razorpay settings
  const rzpConfig = useQuery(api.settings.getRazorpayConfig);
  const setRazorpayKeys = useMutation(api.settings.setRazorpayKeys);
  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpKeySecret, setRzpKeySecret] = useState("");

  // Review email settings
  const reviewEmailSettings = useQuery(api.settings.getReviewEmailSettings);
  const setReviewEmailSettings = useMutation(api.settings.setReviewEmailSettings);
  const [reviewEnabled, setReviewEnabled] = useState<boolean | null>(null);
  const [reviewDelay, setReviewDelay] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [savingRzp, setSavingRzp] = useState(false);

  const handleSaveRate = async () => {
    const parsed = parseFloat(rateInput);
    if (isNaN(parsed) || parsed <= 0 || parsed >= 1) {
      toast.error("Rate must be between 0 and 1 (e.g. 0.012 for 1 INR = $0.012)");
      return;
    }
    setSavingRate(true);
    try {
      await setFallbackRate({ rate: parsed });
      toast.success("Fallback rate saved");
      setRateInput("");
    } catch {
      toast.error("Failed to save rate");
    } finally {
      setSavingRate(false);
    }
  };

  const handleSaveRzp = async () => {
    if (!rzpKeyId || !rzpKeySecret) {
      toast.error("Both Key ID and Key Secret are required");
      return;
    }
    setSavingRzp(true);
    try {
      await setRazorpayKeys({ keyId: rzpKeyId.trim(), keySecret: rzpKeySecret.trim() });
      toast.success("Razorpay credentials saved!");
      setRzpKeySecret("");
      setRzpKeyId("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSavingRzp(false);
    }
  };

  const handleLoadDemo = () => {
    setRzpKeyId(DEMO_KEY_ID);
    setRzpKeySecret(DEMO_KEY_SECRET);
    toast.info("Demo credentials loaded — these only work for UI testing, not real payments.");
  };

  // Example conversions using the active rate
  const activeRate = parseFloat(rateInput) || currentRate || 0.012;
  const examples = [39, 99, 299, 999];

  return (
    <div className="max-w-xl space-y-6">

      {/* ── Razorpay Config ── */}
      <div className="rounded-xl border border-white/8 bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Razorpay Payment Gateway</h3>
            <p className="text-xs text-muted-foreground">Configure your Razorpay API keys for accepting payments</p>
          </div>
        </div>

        {/* Current status */}
        {rzpConfig && (
          <div className="rounded-lg border border-white/8 bg-background/50 p-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${rzpConfig.mode === "live" ? "bg-green-500" : rzpConfig.mode === "test" ? "bg-yellow-500" : "bg-red-500"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {rzpConfig.mode === "live" ? "Live mode — real payments active" :
                 rzpConfig.mode === "test" ? "Test mode — demo payments only" :
                 "Not configured — payments will fail"}
              </p>
              {rzpConfig.keyId && (
                <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{rzpConfig.keyId}</p>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              rzpConfig.mode === "live" ? "bg-green-500/10 border-green-500/30 text-green-400" :
              rzpConfig.mode === "test" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" :
              "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {rzpConfig.mode === "none" ? "missing" : rzpConfig.mode}
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Key ID</Label>
            <Input
              placeholder="rzp_test_... or rzp_live_..."
              value={rzpKeyId}
              onChange={(e) => setRzpKeyId(e.target.value)}
              className="bg-background border-white/10 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Key Secret</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder="Your Razorpay key secret"
                value={rzpKeySecret}
                onChange={(e) => setRzpKeySecret(e.target.value)}
                className="bg-background border-white/10 text-sm font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full gap-2 text-xs"
            onClick={handleLoadDemo}
          >
            Load test credentials
          </Button>
          <Button
            size="sm"
            className="rounded-full gap-2 flex-1"
            onClick={handleSaveRzp}
            disabled={savingRzp || (!rzpKeyId && !rzpKeySecret)}
          >
            {savingRzp ? <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save credentials
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground bg-background/40 rounded-lg p-3 border border-white/8">
          Get your API keys from{" "}
          <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            dashboard.razorpay.com → Settings → API Keys
          </a>. Use <span className="font-mono">rzp_test_</span> keys for testing, <span className="font-mono">rzp_live_</span> for real payments.
        </p>
      </div>

      {/* ── Currency Conversion ── */}
      <div className="rounded-xl border border-white/8 bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Currency Conversion</h3>
            <p className="text-xs text-muted-foreground">Fallback INR → USD rate (used when live API is unavailable)</p>
          </div>
        </div>

        <div className="rounded-lg border border-white/8 bg-background/50 p-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Current fallback rate</span>
            <span className="font-mono font-bold text-primary">
              {currentRate !== undefined ? currentRate.toFixed(6) : "loading…"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            ₹1 = ${currentRate !== undefined ? currentRate.toFixed(4) : "…"} USD
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Set new fallback rate</Label>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Enter the value of 1 INR in USD. Example: <span className="font-mono text-foreground">0.01199</span> means ₹1 = $0.01199
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.0001"
              min="0.0001"
              max="0.9999"
              placeholder="e.g. 0.0120"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="bg-background border-white/10 text-sm font-mono"
            />
            <Button onClick={handleSaveRate} disabled={savingRate || !rateInput} className="rounded-full shrink-0">
              {savingRate ? <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Live preview with current rate</p>
          <div className="grid grid-cols-2 gap-2">
            {examples.map((inr) => (
              <div key={inr} className="rounded-lg border border-white/8 bg-background/30 p-2.5 flex justify-between text-xs">
                <span className="text-muted-foreground font-mono">₹{inr}</span>
                <span className="text-foreground font-mono font-semibold">${(inr * activeRate).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-card p-5 text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground text-sm">How currency conversion works</p>
        <ul className="space-y-1.5 list-disc list-inside">
          <li>Product prices are stored in INR in the database</li>
          <li>Live rate is fetched from frankfurter.app (updated every hour)</li>
          <li>If live rate is unavailable, this fallback rate is used</li>
          <li>Razorpay always charges in INR — the $ price is display only</li>
          <li>Update this rate periodically to keep prices accurate</li>
        </ul>
      </div>

      {/* ── Review Request Emails ── */}
      <div className="rounded-xl border border-white/8 bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Review Request Emails</h3>
            <p className="text-xs text-muted-foreground">Automatically email buyers asking for a review after purchase</p>
          </div>
        </div>

        {reviewEmailSettings && (
          <div className="rounded-lg border border-white/8 bg-background/50 p-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${reviewEmailSettings.enabled ? "bg-green-500" : "bg-red-500"}`} />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">
                {reviewEmailSettings.enabled
                  ? `Enabled — emails sent ${reviewEmailSettings.delayDays} day${reviewEmailSettings.delayDays !== 1 ? "s" : ""} after purchase`
                  : "Disabled — no review emails will be sent"}
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              reviewEmailSettings.enabled
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {reviewEmailSettings.enabled ? "on" : "off"}
            </span>
          </div>
        )}

        <div className="space-y-4">
          {/* Enable/disable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Review request emails</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {(reviewEnabled ?? reviewEmailSettings?.enabled ?? true) ? "Enabled" : "Disabled"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReviewEnabled(!(reviewEnabled ?? reviewEmailSettings?.enabled ?? true))}
              className={cn(
                "relative w-10 h-6 rounded-full border transition-colors cursor-pointer shrink-0 overflow-hidden",
                (reviewEnabled ?? reviewEmailSettings?.enabled ?? true)
                  ? "bg-primary border-primary"
                  : "bg-white/5 border-white/15"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                (reviewEnabled ?? reviewEmailSettings?.enabled ?? true) ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>

          {/* Delay */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Send delay (days after purchase)</Label>
            <Input
              type="number"
              min={0}
              max={365}
              placeholder={String(reviewEmailSettings?.delayDays ?? 3)}
              value={reviewDelay}
              onChange={(e) => setReviewDelay(e.target.value)}
              className="bg-background border-white/10 text-sm w-32"
            />
            <p className="text-[11px] text-muted-foreground">
              Current: <span className="text-foreground font-medium">{reviewEmailSettings?.delayDays ?? 3} days</span> after payment.
              Set to 0 to send immediately.
            </p>
          </div>

          <Button
            size="sm"
            className="rounded-full px-6 gap-2"
            disabled={savingReview}
            onClick={async () => {
              const enabled = reviewEnabled ?? reviewEmailSettings?.enabled ?? true;
              const delay = reviewDelay !== "" ? parseInt(reviewDelay, 10) : (reviewEmailSettings?.delayDays ?? 3);
              if (isNaN(delay) || delay < 0 || delay > 365) {
                toast.error("Delay must be 0–365 days");
                return;
              }
              setSavingReview(true);
              try {
                await setReviewEmailSettings({ enabled, delayDays: delay });
                toast.success("Review email settings saved");
                setReviewEnabled(null);
                setReviewDelay("");
              } catch {
                toast.error("Failed to save");
              } finally {
                setSavingReview(false);
              }
            }}
          >
            {savingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save settings
          </Button>
        </div>

        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pt-1 border-t border-white/8">
          <li>The email includes a direct link to their purchase page with the review form open</li>
          <li>Reviews from this link are automatically marked as Verified Buyer</li>
          <li>Uses the support address: prodxstoresupport@gmail.com</li>
        </ul>
      </div>

      {/* ── Review Behaviour Settings ── */}
      <ReviewSettingsPanel />

      {/* ── Trust Badge Settings ── */}
      <TrustBadgeSettingsPanel />

      {/* ── Social Proof Notifications ── */}
      <SocialProofSettingsPanel />

      <DataExportPanel />

    </div>
  );
}


// ─── Types ────────────────────────────────────────────────────────────────────

type FormValues = {
  name: string;
  slug: string;
  category: string;
  tagline: string;
  description: string;
  price: string;
  originalPrice: string;
  badge: string;
  image: string;
  screenshots: string;
  features: string;
  whatsIncluded: string;
  highlights: string;
};

type DeliveryAssetForm = {
  id?: Id<"deliveryAssets">;
  name: string;
  deliveryType: string;
  url: string;
  instructions: string;
  displayOrder: number;
  enabled: boolean;
};

const DELIVERY_TYPES = [
  "File Upload", "ZIP", "PDF", "Google Drive", "Dropbox", "OneDrive",
  "Mega", "Canva", "GitHub", "External URL", "Course URL", "Membership URL",
  "License Key", "Source Code",
];

const EMPTY_FORM: FormValues = {
  name: "", slug: "", category: "", tagline: "", description: "",
  price: "", originalPrice: "", badge: "", image: "", screenshots: "",
  features: "", whatsIncluded: "", highlights: "",
};

function toFormValues(p: DbProduct): FormValues {
  return {
    name: p.name, slug: p.slug, category: p.category, tagline: p.tagline,
    description: p.description, price: String(p.price),
    originalPrice: String(p.originalPrice), badge: p.badge ?? "",
    image: p.image, screenshots: p.screenshots.join("\n"),
    features: p.features.join("\n"),
    whatsIncluded: p.whatsIncluded.join("\n"),
    highlights: p.highlights.map((h) => `${h.label}:${h.value}`).join("\n"),
  };
}

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function inputCls(error?: string) {
  return cn("border bg-background text-sm focus:ring-2 focus:ring-primary/40 transition-colors",
    error ? "border-destructive" : "border-white/10");
}

function FormField({ label, error, hint, children }: {
  label: string; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground -mt-1">{hint}</p>}
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

// ─── Delivery Asset Row ───────────────────────────────────────────────────────

function DeliveryAssetRow({
  asset,
  onEdit,
  onDelete,
}: {
  asset: Doc<"deliveryAssets">;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-background/50">
      <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground">{asset.deliveryType}</p>
      </div>
      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium",
        asset.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-muted-foreground")}>
        {asset.enabled ? "Enabled" : "Disabled"}
      </span>
      <button onClick={onEdit} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <Pencil className="w-3 h-3" />
      </button>
      <button onClick={onDelete} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Delivery Asset Form ──────────────────────────────────────────────────────

function DeliveryAssetFormPanel({
  productId,
  initial,
  onClose,
}: {
  productId: Id<"products">;
  initial?: Doc<"deliveryAssets">;
  onClose: () => void;
}) {
  const upsert = useMutation(api.deliveryAssets.upsert);
  const generateUploadUrl = useMutation(api.deliveryAssets.generateUploadUrl);
  const [form, setForm] = useState<DeliveryAssetForm>({
    id: initial?._id,
    name: initial?.name ?? "",
    deliveryType: initial?.deliveryType ?? DELIVERY_TYPES[0],
    url: initial?.url ?? "",
    instructions: initial?.instructions ?? "",
    displayOrder: initial?.displayOrder ?? 0,
    enabled: initial?.enabled ?? true,
  });
  const [storageId, setStorageId] = useState<string | undefined>(initial?.storageId);
  const [fileName, setFileName] = useState<string | undefined>(initial?.fileName);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFileUpload = form.deliveryType === "File Upload";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File must be under 100 MB");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId: sid } = await res.json() as { storageId: string };
      setStorageId(sid);
      setFileName(file.name);
      // Clear any manual URL since the file is now in storage
      setForm((f) => ({ ...f, url: "" }));
      toast.success(`"${file.name}" uploaded successfully`);
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Asset name is required");
      return;
    }
    if (isFileUpload && !storageId) {
      toast.error("Please upload a file first");
      return;
    }
    if (!isFileUpload && !form.url.trim()) {
      toast.error("URL / License Key is required");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        id: form.id,
        productId,
        name: form.name.trim(),
        deliveryType: form.deliveryType,
        url: form.url.trim(),
        storageId,
        fileName,
        instructions: form.instructions.trim() || undefined,
        displayOrder: form.displayOrder,
        enabled: form.enabled,
      });
      toast.success(form.id ? "Asset updated" : "Asset added");
      onClose();
    } catch {
      toast.error("Failed to save asset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
        {form.id ? "Edit Asset" : "New Asset"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Asset Name *">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Main Bundle" className={inputCls()} />
        </FormField>
        <FormField label="Delivery Type *">
          <select
            value={form.deliveryType}
            onChange={(e) => setForm({ ...form, deliveryType: e.target.value, url: "" })}
            className="w-full h-9 rounded-lg border border-white/10 bg-background text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {DELIVERY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
      </div>

      {/* File upload UI when type is "File Upload" */}
      {isFileUpload ? (
        <FormField label="Upload File *" hint="Buyers will get a direct download link (max 100 MB)">
          <div className="space-y-2">
            {storageId && fileName ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <FileUp className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-300 truncate">{fileName}</p>
                  <p className="text-xs text-emerald-400/70">Ready to deliver</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={cn(
                  "h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors",
                  uploading ? "cursor-wait border-primary/40" : "border-white/15 hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Uploading…</p>
                  </>
                ) : (
                  <>
                    <FileUp className="w-5 h-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Drop file here or <span className="text-primary">click to upload</span>
                    </p>
                  </>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>
        </FormField>
      ) : (
        <FormField label="URL / Link / License Key *"
          hint={form.deliveryType === "License Key" ? "Paste the license key here" : "Paste the download or access URL"}>
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder={form.deliveryType === "License Key" ? "XXXX-XXXX-XXXX-XXXX" : "https://..."}
            className={inputCls()} />
        </FormField>
      )}

      <FormField label="Instructions" hint="Optional — shown to buyer on the download page">
        <Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          placeholder="e.g. Click Make a copy to save to your Drive" className={inputCls()} />
      </FormField>

      <div className="grid grid-cols-2 gap-3 items-end">
        <FormField label="Display Order">
          <Input type="number" min={0} value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            className={inputCls()} />
        </FormField>
        <div className="flex items-center gap-2 pb-1">
          <button type="button" onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className="cursor-pointer">
            {form.enabled
              ? <ToggleRight className="w-8 h-8 text-primary" />
              : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
          </button>
          <span className="text-xs text-muted-foreground">{form.enabled ? "Enabled" : "Disabled"}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={onClose}>Cancel</Button>
        <Button type="button" size="sm" className="rounded-full gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}

// ─── Delivery Assets Section ──────────────────────────────────────────────────

function DeliveryAssetsSection({ productId }: { productId: Id<"products"> }) {
  const assets = useQuery(api.deliveryAssets.listByProduct, { productId });
  const removeAsset = useMutation(api.deliveryAssets.remove);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Doc<"deliveryAssets"> | null>(null);

  const handleDelete = async (id: Id<"deliveryAssets">) => {
    try {
      await removeAsset({ id });
      toast.success("Asset removed");
    } catch {
      toast.error("Failed to remove asset");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" /> Delivery Assets
        </p>
        <Button type="button" size="sm" variant="secondary" className="rounded-full text-xs gap-1.5 h-7"
          onClick={() => { setAdding(true); setEditing(null); }}>
          <Plus className="w-3 h-3" /> Add asset
        </Button>
      </div>

      {(adding && !editing) && (
        <DeliveryAssetFormPanel productId={productId} onClose={() => setAdding(false)} />
      )}

      {assets === undefined && <Skeleton className="h-12 w-full rounded-xl" />}
      {assets?.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No delivery assets yet. Add a download link or file above.
        </p>
      )}

      <div className="space-y-2">
        {assets?.map((asset) => (
          <div key={asset._id}>
            <DeliveryAssetRow
              asset={asset}
              onEdit={() => { setEditing(asset); setAdding(false); }}
              onDelete={() => handleDelete(asset._id)}
            />
            {editing?._id === asset._id && (
              <div className="mt-2">
                <DeliveryAssetFormPanel
                  productId={productId}
                  initial={editing}
                  onClose={() => setEditing(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Product Form Modal ────────────────────────────────────────────────────────

function ProductFormModal({ initial, onClose }: { initial?: DbProduct; onClose: () => void }) {
  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);
  const isEdit = !!initial;

  const [form, setForm] = useState<FormValues>(initial ? toFormValues(initial) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<FormValues>>({});

  const set = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "name" && !isEdit) next.slug = slugify(val);
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<FormValues> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.slug.trim()) errs.slug = "Required";
    if (!form.category.trim()) errs.category = "Required";
    if (!form.tagline.trim()) errs.tagline = "Required";
    if (!form.description.trim()) errs.description = "Required";
    if (!form.price || isNaN(Number(form.price))) errs.price = "Must be a number";
    if (!form.originalPrice || isNaN(Number(form.originalPrice))) errs.originalPrice = "Must be a number";
    if (!form.image.trim()) errs.image = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), slug: form.slug.trim(), category: form.category.trim(),
        tagline: form.tagline.trim(), description: form.description.trim(),
        price: Number(form.price), originalPrice: Number(form.originalPrice),
        badge: form.badge.trim() || undefined, image: form.image.trim(),
        screenshots: form.screenshots.split("\n").map((s) => s.trim()).filter(Boolean),
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        whatsIncluded: form.whatsIncluded.split("\n").map((s) => s.trim()).filter(Boolean),
        highlights: form.highlights.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
          const idx = line.indexOf(":");
          return idx === -1 ? { label: line, value: "" } : { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
        }),
      };
      if (isEdit) {
        await update({ id: initial._id, ...payload });
        toast.success("Product updated");
      } else {
        await create(payload);
        toast.success("Product created");
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative w-full max-w-lg h-full bg-card border-l border-white/8 flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">{isEdit ? "Edit product" : "New product"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? `Editing "${initial.name}"` : "Fill in the details below"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <FormField label="Product name *" error={errors.name}>
            <Input value={form.name} onChange={set("name")} placeholder="e.g. UI Component Kit" className={inputCls(errors.name)} />
          </FormField>
          <FormField label="URL slug *" error={errors.slug} hint="Used in the product page URL">
            <Input value={form.slug} onChange={set("slug")} placeholder="e.g. ui-component-kit" className={inputCls(errors.slug)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category *" error={errors.category}>
              <Input value={form.category} onChange={set("category")} placeholder="e.g. Design" className={inputCls(errors.category)} />
            </FormField>
            <FormField label="Badge" hint="Optional — e.g. New, Hot">
              <Input value={form.badge} onChange={set("badge")} placeholder="Best Seller" className={inputCls()} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price ($) *" error={errors.price}>
              <Input type="number" min="0" value={form.price} onChange={set("price")} placeholder="49" className={inputCls(errors.price)} />
            </FormField>
            <FormField label="Original price ($) *" error={errors.originalPrice}>
              <Input type="number" min="0" value={form.originalPrice} onChange={set("originalPrice")} placeholder="89" className={inputCls(errors.originalPrice)} />
            </FormField>
          </div>
          <FormField label="Tagline *" error={errors.tagline} hint="One short sentence">
            <Input value={form.tagline} onChange={set("tagline")} placeholder="300+ production-ready components" className={inputCls(errors.tagline)} />
          </FormField>
          <FormField label="Description *" error={errors.description} hint="2-3 sentences">
            <textarea value={form.description} onChange={set("description")} rows={3}
              placeholder="A comprehensive library of..."
              className={cn("w-full rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors", errors.description ? "border-destructive" : "border-white/10")} />
          </FormField>
          <ImageUploader
            label="Main Image *"
            hint="Main product image"
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            error={errors.image}
          />
          <MultiImageUploader
            label="Screenshots"
            hint="Product preview images"
            value={form.screenshots}
            onChange={(val) => setForm((f) => ({ ...f, screenshots: val }))}
          />
          <FormField label="Features" hint="3 bullet points shown on the card — one per line">
            <textarea value={form.features} onChange={set("features")} rows={3}
              placeholder={"Figma + React source\nDark & light themes\nLifetime updates"}
              className="w-full rounded-lg border border-white/10 bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors" />
          </FormField>
          <FormField label="What's included" hint="One item per line">
            <textarea value={form.whatsIncluded} onChange={set("whatsIncluded")} rows={4}
              placeholder={"300+ Figma frames\nReact source code\n..."}
              className="w-full rounded-lg border border-white/10 bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors" />
          </FormField>
          <FormField label="Highlights" hint="Label:Value — one per line, e.g. Components:300+">
            <textarea value={form.highlights} onChange={set("highlights")} rows={4}
              placeholder={"Components:300+\nFile formats:Figma, TSX\nThemes:Dark & Light\nUpdates:Lifetime"}
              className="w-full rounded-lg border border-white/10 bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors" />
          </FormField>

          {/* ── Delivery Assets (only for existing products) */}
          {isEdit && (
            <div className="rounded-xl border border-white/10 bg-background/50 p-4">
              <DeliveryAssetsSection productId={initial._id} />
            </div>
          )}

          <div className="h-4" />
        </form>

        <div className="px-6 py-4 border-t border-white/8 flex gap-3 shrink-0">
          <Button type="button" variant="secondary" className="flex-1 rounded-full" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1 rounded-full gap-2" disabled={saving} onClick={handleSubmit}>
            {saving ? <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ product, onClose }: { product: DbProduct; onClose: () => void }) {
  const remove = useMutation(api.products.remove);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove({ id: product._id });
      toast.success("Product deleted");
      onClose();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm bg-card border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="w-10 h-10 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center">
          <Trash2 className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Delete "{product.name}"?</h3>
          <p className="text-sm text-muted-foreground mt-1">This cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 rounded-full" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 rounded-full bg-destructive hover:bg-destructive/90 text-white"
            disabled={deleting} onClick={handleDelete}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Product Row ───────────────────────────────────────────────────────────────

function ProductRow({ product, onEdit, onDelete, onUpsell }: { product: DbProduct; onEdit: () => void; onDelete: () => void; onUpsell: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-background/50 group">
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/8">
        {product.image
          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-card flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/40" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
          {product.badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium">{product.badge}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{product.category} · {product.tagline}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-foreground">₹{product.price}</p>
        <p className="text-xs text-muted-foreground line-through">₹{product.originalPrice}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onEdit} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors" title="Edit product">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onUpsell} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary cursor-pointer transition-colors" title="Configure upsells">
          <Sparkles className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer transition-colors" title="Delete product">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <Link to={`/product/${product.slug}`} target="_blank"
          className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Upsell Config Panel ────────────────────────────────────────────────────

function UpsellConfigPanel({ product, onClose }: { product: DbProduct; onClose: () => void }) {
  const allProducts = useQuery(api.products.list);
  const setUpsells = useMutation(api.products.setUpsells);
  const [selected, setSelected] = useState<string[]>(
    (product as DbProduct & { upsellProductIds?: string[] }).upsellProductIds ?? []
  );
  const [saving, setSaving] = useState(false);

  const others = allProducts?.filter((p) => p._id !== product._id) ?? [];

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setUpsells({ productId: product._id, upsellProductIds: selected as Id<"products">[] });
      toast.success("Upsell products saved");
      onClose();
    } catch {
      toast.error("Failed to save upsells");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring" as const, stiffness: 320, damping: 32 }}
        className="relative w-full max-w-md h-full bg-card border-l border-white/8 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="font-semibold text-foreground text-sm">Upsell Products</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick up to 3 products to show after buying <strong>{product.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Selected {selected.length}/3 — if none selected, buyers will see same-category products automatically.
          </p>
          {others.map((p) => {
            const isSelected = selected.includes(p._id);
            return (
              <button
                key={p._id}
                onClick={() => toggle(p._id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left",
                  isSelected
                    ? "border-primary/40 bg-primary/8"
                    : "border-white/8 bg-background/50 hover:border-white/15"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-white/20"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/8">
                  {p.image
                    ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-card flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/40" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.category} · ₹{p.price}</p>
                </div>
                {!isSelected && selected.length >= 3 && (
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">Max 3</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-white/8 shrink-0 flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Save Upsells"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </motion.div>
    </div>
  );
}



function OrdersTab() {
  const orders = useQuery(api.orders.listOrders);
  const deleteOrder = useMutation(api.orders.deleteOrder);
  const updateNotes = useMutation(api.orders.updateNotes);
  const resendEmail = useAction(api.razorpay.resendDeliveryEmail);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesEditing, setNotesEditing] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [exportStatus, setExportStatus] = useState<"all" | "paid" | "created" | "failed">("paid");
  const [exporting, setExporting] = useState(false);

  // CSV export data — always fetched, used only on demand
  const csvRows = useQuery(api.orders.exportOrdersCsv, { status: exportStatus });

  const handleExportCsv = () => {
    if (!csvRows || csvRows.length === 0) {
      toast.info("No orders to export with the selected filter");
      return;
    }
    setExporting(true);
    try {
      const mapped = csvRows.map((r) => ({
        "Order Number": r.orderNumber,
        "Date (UTC)": r.date,
        "Customer Name": r.customerName,
        "Customer Email": r.customerEmail,
        "Customer Mobile": r.customerMobile,
        "Items": r.items,
        "Item Count": r.itemCount,
        "Total (₹)": r.totalInr,
        "Promo Code": r.promoCode,
        "Promo Discount": r.promoDiscount,
        "Affiliate Code": r.affiliateCode,
        "Status": r.status,
        "Email Sent": r.emailSent,
        "Downloads": r.downloads,
        "Razorpay Order ID": r.razorpayOrderId,
      }));

      const csv = Papa.unparse(mapped, { quotes: true, header: true });
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `prodxstore-orders-${exportStatus}-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${csvRows.length} orders to CSV`);
    } catch {
      toast.error("Export failed — please try again");
    } finally {
      setExporting(false);
    }
  };

  if (orders === undefined) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-foreground mb-1">No orders yet</p>
        <p className="text-sm text-muted-foreground">Orders will appear here after customers purchase.</p>
      </div>
    );
  }

  const handleResend = async (orderId: Id<"orders">) => {
    try {
      await resendEmail({ orderId });
      toast.success("Delivery email resent!");
    } catch {
      toast.error("Failed to resend email");
    }
  };

  const handleDelete = async (orderId: Id<"orders">) => {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    try {
      await deleteOrder({ orderId });
      toast.success("Order deleted");
    } catch {
      toast.error("Failed to delete order");
    }
  };

  const handleSaveNotes = async (orderId: Id<"orders">) => {
    try {
      await updateNotes({ orderId, notes: notesValue });
      toast.success("Notes saved");
      setNotesEditing(null);
    } catch {
      toast.error("Failed to save notes");
    }
  };

  return (
    <div className="space-y-4">

      {/* ── CSV Export Panel ── */}
      <div className="rounded-xl border border-white/8 bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <FileDown className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Export Orders</p>
            <p className="text-[11px] text-muted-foreground">
              Download a spreadsheet with order details, customer info, and totals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter chips */}
          <div className="flex items-center gap-1 bg-background/60 border border-white/8 rounded-lg p-0.5">
            {(["all", "paid", "created", "failed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setExportStatus(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer",
                  exportStatus === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            className="rounded-full gap-1.5 text-xs h-8 px-4"
            onClick={handleExportCsv}
            disabled={exporting || csvRows === undefined}
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            {csvRows !== undefined ? `Export ${csvRows.length} orders` : "Loading…"}
          </Button>
        </div>
      </div>

      {/* ── Order rows ── */}
      <div className="space-y-3">
      {orders.map((order) => {
        const isExpanded = expandedId === order._id;
        const statusColor = order.status === "paid" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          : order.status === "failed" ? "text-destructive border-destructive/30 bg-destructive/10"
          : "text-muted-foreground border-white/10 bg-white/5";

        return (
          <motion.div key={order._id} layout className="rounded-xl border border-white/8 bg-background/50 overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-medium text-sm text-foreground">{order.customerName}</p>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", statusColor)}>
                    {order.status}
                  </span>
                  {order.emailSent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-medium flex items-center gap-1">
                      <MailCheck className="w-2.5 h-2.5" /> Email sent
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.items.map((i) => i.productName).join(", ")} ·{" "}
                  ₹{Math.round(order.amountInPaise / 100)}
                </p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs text-muted-foreground">{order.orderNumber ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order._creationTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                  <Download className="w-3 h-3" /> {order.downloadCount ?? 0} downloads
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setExpandedId(isExpanded ? null : order._id)}
                  className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                className="border-t border-white/8 px-4 py-4 space-y-3">
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleResend(order._id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors cursor-pointer">
                    <Mail className="w-3 h-3" /> Resend email
                  </button>
                  {order.orderNumber && (
                    <button
                      onClick={() => {
                        const token = ""; // token not stored directly, direct to access-purchase
                        navigator.clipboard.writeText(`${window.location.origin}/access-purchase`);
                        toast.success("Access page link copied!");
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors cursor-pointer">
                      <Copy className="w-3 h-3" /> Copy access link
                    </button>
                  )}
                  <button onClick={() => handleDelete(order._id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-destructive/20 text-destructive/70 hover:text-destructive hover:border-destructive/40 transition-colors cursor-pointer">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>

                {/* Internal notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Internal Notes
                    </p>
                    {notesEditing !== order._id && (
                      <button onClick={() => { setNotesEditing(order._id); setNotesValue(order.internalNotes ?? ""); }}
                        className="text-[11px] text-primary hover:underline cursor-pointer">Edit</button>
                    )}
                  </div>
                  {notesEditing === order._id ? (
                    <div className="flex gap-2">
                      <Input value={notesValue} onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="Add internal notes..." className="bg-background border-white/10 text-xs h-8 flex-1" />
                      <Button size="sm" className="rounded-full h-8 text-xs px-3" onClick={() => handleSaveNotes(order._id)}>Save</Button>
                      <Button size="sm" variant="secondary" className="rounded-full h-8 text-xs px-3" onClick={() => setNotesEditing(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{order.internalNotes || "No notes"}</p>
                  )}
                </div>

                {/* Raw data */}
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Show raw order data</summary>
                  <pre className="mt-2 bg-background rounded-lg p-3 overflow-x-auto text-[11px] text-muted-foreground border border-white/8">
                    {JSON.stringify({ razorpayOrderId: order.razorpayOrderId, razorpayPaymentId: order.razorpayPaymentId, promoCode: order.promoCode, customerMobile: order.customerMobile }, null, 2)}
                  </pre>
                </details>
              </motion.div>
            )}
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}

// ─── 403 page ─────────────────────────────────────────────────────────────────

function ForbiddenPage() {
  const bootstrapAdmin = useMutation(api.users.bootstrapAdmin);
  const adminExists = useQuery(api.users.adminExists);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await bootstrapAdmin();
      toast.success("You are now super_admin — refreshing…");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("Failed to claim admin");
      }
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-16 h-16 rounded-2xl border border-destructive/20 bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-7 h-7 text-destructive" />
        </div>
        <p className="text-xs uppercase tracking-widest text-destructive font-medium mb-2">403 Forbidden</p>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {adminExists
            ? "You don't have admin privileges. Contact the store owner."
            : "No admin has been set up yet."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/">Back to store</Link>
          </Button>
          {adminExists === false && (
            <Button className="rounded-full" onClick={handleClaim} disabled={claiming}>
              {claiming ? "Claiming…" : "Claim Admin (first setup)"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Gate (role check) ─────────────────────────────────────────────────

function AdminGate() {
  const user = useQuery(api.users.getCurrentUser);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
          <p className="text-muted-foreground text-sm mt-3">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return <ForbiddenPage />;
  }

  return <AdminContent />;
}

// ─── Admin Content ─────────────────────────────────────────────────────────────

// Tab bar with pending-reviews badge (must use hooks, so a separate component)
function AdminTabBar({
  tab,
  setTab,
}: {
  tab: string;
  setTab: (t: "products" | "orders" | "reviews" | "testimonials" | "analytics" | "coupons" | "affiliates" | "settings") => void;
}) {
  const pendingCount = useQuery(api.reviews.pendingCount, {}) ?? 0;

  const tabs: { key: "products" | "orders" | "reviews" | "testimonials" | "analytics" | "coupons" | "affiliates" | "settings"; label: string; icon: React.ReactNode }[] = [
    { key: "products",     label: "Products",      icon: <Package className="w-3 h-3" /> },
    { key: "orders",       label: "Orders",         icon: <ShoppingBag className="w-3 h-3" /> },
    { key: "reviews",      label: "Reviews",        icon: <Star className="w-3 h-3" /> },
    { key: "testimonials", label: "Testimonials",   icon: <Sparkles className="w-3 h-3" /> },
    { key: "analytics",   label: "Analytics",      icon: <BarChart2 className="w-3 h-3" /> },
    { key: "coupons",     label: "Coupons",         icon: <Tag className="w-3 h-3" /> },
    { key: "affiliates",  label: "Affiliates",      icon: <Link2 className="w-3 h-3" /> },
    { key: "settings",     label: "Settings",       icon: <Settings className="w-3 h-3" /> },
  ];

  return (
    <>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={cn(
            "relative px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
            tab === t.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <span className="flex items-center gap-1.5">
            {t.icon} {t.label}
          </span>
          {t.key === "reviews" && pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 text-background text-[10px] font-bold flex items-center justify-center">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
      ))}
    </>
  );
}

function AdminContent() {
  const products = useQuery(api.products.list);
  const seed = useMutation(api.products.seed);
  const [tab, setTab] = useState<"products" | "orders" | "reviews" | "testimonials" | "analytics" | "coupons" | "affiliates" | "settings">("products");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<DbProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<DbProduct | null>(null);
  const [upsellProduct, setUpsellProduct] = useState<DbProduct | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seed();
      toast.success("Sample products loaded");
    } catch {
      toast.error("Failed to seed products");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/5 backdrop-blur-xl bg-background/80 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 cursor-pointer">
              <img src="https://hercules-cdn.com/file_3y9pBv81Yd6f6aK28NIgGthc" alt="ProdXStore" className="h-7 w-auto" />
            </Link>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === "products" && products?.length === 0 && (
              <Button variant="secondary" size="sm" className="rounded-full text-xs gap-1.5"
                onClick={handleSeed} disabled={seeding}>
                <Zap className="w-3 h-3" /> Load sample products
              </Button>
            )}
            {tab === "products" && (
              <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5" /> New product
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6 flex gap-1 pb-3">
          <AdminTabBar tab={tab} setTab={setTab} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {tab === "products" && (
          <>
            {products && products.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Total products", value: products.length },
                  { label: "Avg. price", value: `₹${Math.round(products.reduce((s, p) => s + p.price, 0) / products.length)}` },
                  { label: "Categories", value: [...new Set(products.map((p) => p.category))].length },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/8 bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {products === undefined
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                : products.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-14 h-14 rounded-2xl border border-white/8 bg-card flex items-center justify-center mb-4">
                      <Package className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                    <p className="font-medium text-foreground mb-1">No products yet</p>
                    <p className="text-sm text-muted-foreground mb-5">Add your first product or load sample data</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="rounded-full text-xs gap-1.5" onClick={handleSeed} disabled={seeding}>
                        <Zap className="w-3 h-3" /> Load samples
                      </Button>
                      <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(true)}>
                        <Plus className="w-3.5 h-3.5" /> New product
                      </Button>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {products.map((p) => (
                      <ProductRow key={p._id} product={p}
                        onEdit={() => setEditProduct(p)} onDelete={() => setDeleteProduct(p)} onUpsell={() => setUpsellProduct(p)} />
                    ))}
                  </AnimatePresence>
                )}
            </div>
          </>
        )}

        {tab === "orders" && <OrdersTab />}
        {tab === "reviews" && <ReviewsTab />}
        {tab === "testimonials" && <AiTestimonialsTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "coupons" && <CouponsTab />}
        {tab === "affiliates" && <AffiliatesTab />}
        {tab === "settings" && <SettingsTab />}
      </main>

      <AnimatePresence>
        {(showForm || editProduct) && (
          <ProductFormModal key="form" initial={editProduct ?? undefined}
            onClose={() => { setShowForm(false); setEditProduct(null); }} />
        )}
        {deleteProduct && (
          <DeleteConfirm key="delete" product={deleteProduct} onClose={() => setDeleteProduct(null)} />
        )}
        {upsellProduct && (
          <UpsellConfigPanel key="upsell" product={upsellProduct} onClose={() => setUpsellProduct(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page (with auth guard) ────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
            <p className="text-muted-foreground text-sm mt-3">Loading…</p>
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
            <p className="text-muted-foreground text-sm mb-6">Sign in to access the admin panel.</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <AdminGate />
      </Authenticated>
    </>
  );
}
