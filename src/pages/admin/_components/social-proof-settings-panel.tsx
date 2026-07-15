import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { SocialProofSettings } from "@/convex/socialProof.ts";

// ─── Reusable toggle switch ───────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
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
  );
}

// ─── Number stepper ───────────────────────────────────────────────────────────

function Stepper({ value, onChange, min, max, step = 1, suffix = "" }: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer transition-colors text-sm font-medium"
      >−</button>
      <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
        {value}{suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer transition-colors text-sm font-medium"
      >+</button>
    </div>
  );
}

// ─── Row layout ───────────────────────────────────────────────────────────────

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function SocialProofSettingsPanel() {
  const remote = useQuery(api.socialProof.getSettings);
  const save = useMutation(api.socialProof.setSettings);
  const [saving, setSaving] = useState(false);

  // Local state mirrors remote settings
  const [cfg, setCfg] = useState<SocialProofSettings | null>(null);

  // Sync from remote once on first load
  if (remote && !cfg) {
    setCfg({ ...remote });
  }

  const set = <K extends keyof SocialProofSettings>(key: K, val: SocialProofSettings[K]) => {
    setCfg((prev) => prev ? { ...prev, [key]: val } : prev);
  };

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      await save(cfg);
      toast.success("Social proof settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const settings = cfg ?? remote;
  if (!settings) {
    return <div className="h-40 rounded-xl bg-white/5 animate-pulse" />;
  }

  return (
    <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Recent Purchase Notifications</p>
          <p className="text-[11px] text-muted-foreground">Show social proof toasts to storefront visitors</p>
        </div>
        <Toggle value={settings.enabled} onChange={(v) => set("enabled", v)} />
      </div>

      <div className="px-5 py-1 divide-y divide-white/0">
        {/* Demo mode — show prominently since it's critical */}
        <Row
          label="Demo Mode"
          description="Show sample notifications when there are no real orders (only enable for testing)"
        >
          <Toggle value={settings.demoMode} onChange={(v) => set("demoMode", v)} />
        </Row>

        {/* Position */}
        <Row label="Position">
          <div className="flex items-center gap-1 bg-background/60 border border-white/8 rounded-lg p-0.5">
            {(["bottom-left", "bottom-center", "bottom-right"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => set("position", pos)}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer whitespace-nowrap",
                  settings.position === pos
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {pos.replace("bottom-", "")}
              </button>
            ))}
          </div>
        </Row>

        {/* Interval */}
        <Row label="Interval (min)" description="Minimum seconds between notifications">
          <Stepper value={settings.intervalMin} onChange={(v) => set("intervalMin", v)} min={5} max={120} step={5} suffix="s" />
        </Row>
        <Row label="Interval (max)" description="Maximum seconds between notifications">
          <Stepper value={settings.intervalMax} onChange={(v) => set("intervalMax", v)} min={settings.intervalMin} max={300} step={5} suffix="s" />
        </Row>

        {/* Display duration */}
        <Row label="Display Duration" description="Seconds each notification stays visible">
          <Stepper value={settings.displayDuration} onChange={(v) => set("displayDuration", v)} min={3} max={15} step={1} suffix="s" />
        </Row>

        {/* Max per session */}
        <Row label="Max per Session" description="Maximum notifications shown per visit">
          <Stepper value={settings.maxPerSession} onChange={(v) => set("maxPerSession", v)} min={1} max={30} step={1} />
        </Row>

        {/* Show toggles */}
        <Row label="Show Product Image">
          <Toggle value={settings.showProductImage} onChange={(v) => set("showProductImage", v)} />
        </Row>
        <Row label="Show Location" description="City/country of buyer if available">
          <Toggle value={settings.showLocation} onChange={(v) => set("showLocation", v)} />
        </Row>
        <Row label="Show Time Ago" description='"2 minutes ago" etc.'>
          <Toggle value={settings.showTimeAgo} onChange={(v) => set("showTimeAgo", v)} />
        </Row>
      </div>

      {/* Save */}
      <div className="px-5 py-4 border-t border-white/8">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full gap-2"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
