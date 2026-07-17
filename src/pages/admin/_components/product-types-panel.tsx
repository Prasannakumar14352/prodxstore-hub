import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import type { ProductTypeDoc } from "@/lib/api/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, X, Lock,
} from "lucide-react";

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

type Row = ProductTypeDoc & { usageCount: number };

export default function ProductTypesPanel() {
  const rows = useQuery(api.productTypes.listWithUsage);
  const create = useMutation(api.productTypes.create);
  const update = useMutation(api.productTypes.update);
  const remove = useMutation(api.productTypes.remove);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null | "new">(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
  }, [rows, search]);

  const move = async (row: Row, direction: -1 | 1) => {
    if (!rows) return;
    const sorted = [...rows].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((r) => r._id === row._id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    await Promise.all([
      update({ ...row, id: row._id, displayOrder: swapWith.displayOrder }),
      update({ ...swapWith, id: swapWith._id, displayOrder: row.displayOrder }),
    ]);
  };

  const toggleActive = async (row: Row) => {
    await update({ ...row, id: row._id, isActive: !row.isActive });
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Product Types</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Options shown in the product form's "Product type" field.
          </p>
        </div>
        <Button size="sm" className="rounded-full gap-1.5 cursor-pointer" onClick={() => setEditing("new")}>
          <Plus className="w-3.5 h-3.5" /> Add type
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search types…" className="pl-9 h-9" />
      </div>

      <div className="space-y-2">
        {rows === undefined && <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>}
        {rows && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No product types match.</p>
        )}
        {filtered.map((row) => (
          <div key={row._id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-background/50">
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(row, -1)} className="text-muted-foreground hover:text-foreground cursor-pointer" title="Move up">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => move(row, 1)} className="text-muted-foreground hover:text-foreground cursor-pointer" title="Move down">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                {row.isSystem && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/15 text-muted-foreground flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> System
                  </span>
                )}
                {!row.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">Inactive</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{row.slug} · {row.usageCount} product{row.usageCount === 1 ? "" : "s"}</p>
            </div>
            <Switch checked={row.isActive} onCheckedChange={() => toggleActive(row)} />
            <button onClick={() => setEditing(row)} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => setDeleting(row)}
              disabled={row.isSystem}
              title={row.isSystem ? "System types can't be deleted — deactivate instead" : "Delete"}
              className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <ProductTypeFormDialog
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            try {
              if (editing === "new") {
                await create(values);
                toast.success("Product type created");
              } else {
                await update({ ...values, id: editing._id, isActive: editing.isActive });
                toast.success("Product type updated");
              }
              setEditing(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Something went wrong");
            }
          }}
        />
      )}

      {deleting && (
        <DeleteWithReassignDialog
          label="product type"
          usageCount={deleting.usageCount}
          options={(rows ?? []).filter((r) => r._id !== deleting._id && r.isActive)}
          onCancel={() => setDeleting(null)}
          onConfirm={async (replacementId) => {
            try {
              await remove({ id: deleting._id, replacementId });
              toast.success("Product type deleted");
              setDeleting(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Something went wrong");
            }
          }}
        />
      )}
    </div>
  );
}

function ProductTypeFormDialog({ initial, onClose, onSave }: {
  initial?: Row;
  onClose: () => void;
  onSave: (values: { name: string; slug: string; description?: string; icon?: string; displayOrder: number }) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(initial?.displayOrder ?? 0));
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return setError("Name is required");
    if (!slug.trim()) return setError("Slug is required");
    setError(null);
    setSaving(true);
    await onSave({
      name: name.trim(), slug: slug.trim(), description: description.trim() || undefined,
      icon: icon.trim() || undefined, displayOrder: Number(displayOrder) || 0,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">{initial ? "Edit product type" : "New product type"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Name *</Label>
          <Input value={name} onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }} placeholder="e.g. AI Tool" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Slug *</Label>
          <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="ai_tool" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Icon</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Sparkles" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Display order</Label>
            <Input type="number" min="0" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 rounded-full" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 rounded-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DeleteWithReassignDialog({ label, usageCount, options, onCancel, onConfirm }: {
  label: string;
  usageCount: number;
  options: { _id: string; name: string }[];
  onCancel: () => void;
  onConfirm: (replacementId?: string) => void | Promise<void>;
}) {
  const [replacementId, setReplacementId] = useState<string>(options[0]?._id ?? "");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">Delete this {label}?</h3>
        {usageCount > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{usageCount}</span> product{usageCount === 1 ? "" : "s"} currently
              use this {label}. Choose a replacement to reassign {usageCount === 1 ? "it" : "them"} to before deleting.
            </p>
            {options.length === 0 ? (
              <p className="text-xs text-destructive">No other active {label}s available to reassign to. Create one first.</p>
            ) : (
              <Select value={replacementId} onValueChange={setReplacementId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((o) => <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 rounded-full" onClick={onCancel}>Cancel</Button>
          <Button
            className="flex-1 rounded-full bg-destructive hover:bg-destructive/90 text-white"
            disabled={confirming || (usageCount > 0 && options.length === 0)}
            onClick={async () => {
              setConfirming(true);
              await onConfirm(usageCount > 0 ? replacementId : undefined);
              setConfirming(false);
            }}
          >
            {confirming ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
