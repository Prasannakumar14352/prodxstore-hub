import { useState } from "react";
import { useQuery, useMutation } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import type { Doc, Id } from "@/lib/api/types.ts";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Copy, RotateCcw, Users, TrendingUp, IndianRupee, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "@/lib/api/values.ts";

type Affiliate = Doc<"affiliates">;

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ─── Affiliate form ───────────────────────────────────────────────────────────

function AffiliateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Affiliate;
  onSave: (data: { id?: Id<"affiliates">; name: string; code: string; email?: string; enabled: boolean; notes?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return; }
    setSaving(true);
    try {
      await onSave({
        id: initial?._id,
        name: name.trim(),
        code: code.trim().toLowerCase(),
        email: email.trim() || undefined,
        enabled,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{initial ? "Edit Affiliate" : "New Affiliate"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Full Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Referral Code *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/ref/</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
              placeholder="john"
              className="bg-white/5 border-white/10 text-sm pl-12"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email (optional)</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            type="email"
            className="bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. YouTube partner"
            className="bg-white/5 border-white/10 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={cn("transition-colors cursor-pointer", enabled ? "text-primary" : "text-muted-foreground")}
        >
          {enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
        </button>
        <span className="text-xs text-muted-foreground">{enabled ? "Active" : "Disabled"}</span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : initial ? "Update" : "Create Affiliate"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Affiliate row ────────────────────────────────────────────────────────────

function AffiliateRow({
  aff,
  onEdit,
  onDelete,
  onToggle,
  onReset,
}: {
  aff: Affiliate;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onReset: () => void;
}) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const refUrl = `${baseUrl}/ref/${aff.code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refUrl);
    toast.success("Referral link copied!");
  };

  const convRate = aff.visits > 0 ? ((aff.conversions / aff.visits) * 100).toFixed(1) : "0.0";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{aff.name}</span>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              aff.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-muted-foreground"
            )}>
              {aff.enabled ? "Active" : "Disabled"}
            </span>
          </div>
          {aff.email && <p className="text-xs text-muted-foreground mt-0.5">{aff.email}</p>}
          <div className="flex items-center gap-1.5 mt-1.5">
            <code className="text-xs text-primary bg-primary/10 rounded px-1.5 py-0.5">/ref/{aff.code}</code>
            <button
              onClick={copyLink}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy referral link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {aff.notes && <p className="text-xs text-muted-foreground mt-1 italic">{aff.notes}</p>}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-muted-foreground hover:text-primary" title="Toggle">
            {aff.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground" title="Edit">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onReset} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-muted-foreground hover:text-yellow-400" title="Reset stats">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-muted-foreground hover:text-red-400" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Visits</p>
          <p className="text-sm font-semibold text-foreground">{aff.visits.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="text-sm font-semibold text-emerald-400">{aff.conversions.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-sm font-semibold text-primary">₹{aff.revenueInr.toLocaleString("en-IN")}</p>
        </div>
      </div>
      <div className="mt-1 text-center">
        <span className="text-[10px] text-muted-foreground">Conversion rate: {convRate}%</span>
      </div>
    </motion.div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function AffiliatesTab() {
  const affiliates = useQuery(api.affiliates.list, {});
  const upsertAff = useMutation(api.affiliates.upsert);
  const toggleAff = useMutation(api.affiliates.toggleEnabled);
  const removeAff = useMutation(api.affiliates.remove);
  const resetStats = useMutation(api.affiliates.resetStats);

  const [showForm, setShowForm] = useState(false);
  const [editAff, setEditAff] = useState<Affiliate | null>(null);

  const totalVisits = affiliates?.reduce((s, a) => s + a.visits, 0) ?? 0;
  const totalConversions = affiliates?.reduce((s, a) => s + a.conversions, 0) ?? 0;
  const totalRevenue = affiliates?.reduce((s, a) => s + a.revenueInr, 0) ?? 0;

  const handleSave = async (data: Parameters<typeof upsertAff>[0]) => {
    try {
      await upsertAff(data);
      toast.success(data.id ? "Affiliate updated" : "Affiliate created");
      setShowForm(false);
      setEditAff(null);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to save affiliate");
      }
    }
  };

  const handleDelete = async (id: Id<"affiliates">) => {
    if (!confirm("Delete this affiliate? Their stats will be lost.")) return;
    try {
      await removeAff({ id });
      toast.success("Affiliate removed");
    } catch {
      toast.error("Failed to remove affiliate");
    }
  };

  const handleToggle = async (id: Id<"affiliates">) => {
    try {
      await toggleAff({ id });
    } catch {
      toast.error("Failed to toggle affiliate");
    }
  };

  const handleReset = async (id: Id<"affiliates">) => {
    if (!confirm("Reset stats for this affiliate? This cannot be undone.")) return;
    try {
      await resetStats({ id });
      toast.success("Stats reset");
    } catch {
      toast.error("Failed to reset stats");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Affiliate Links</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create unique referral links. Visits and conversions are tracked automatically.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditAff(null); setShowForm(true); }}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Affiliate
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Visits" value={totalVisits.toLocaleString()} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Total Orders" value={totalConversions.toLocaleString()} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} icon={<IndianRupee className="w-4 h-4" />} />
      </div>

      {/* Form */}
      <AnimatePresence>
        {(showForm || editAff) && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AffiliateForm
              initial={editAff ?? undefined}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditAff(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {affiliates === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : affiliates.length === 0 ? (
        <div className="rounded-xl border border-white/8 border-dashed p-10 text-center">
          <Link2 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No affiliates yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Create your first affiliate link to start tracking referrals</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {affiliates.map((aff) => (
              <AffiliateRow
                key={aff._id}
                aff={aff}
                onEdit={() => { setEditAff(aff); setShowForm(false); }}
                onDelete={() => handleDelete(aff._id)}
                onToggle={() => handleToggle(aff._id)}
                onReset={() => handleReset(aff._id)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
