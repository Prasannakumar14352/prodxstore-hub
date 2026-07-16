import { useState } from "react";
import { useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  TrendingUp, ShoppingBag, IndianRupee, Package,
  Clock, ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

// ── Date-range options ──────────────────────────────────────────────────────

type Range = "7d" | "30d" | "all";
const RANGES: { label: string; value: Range; ms: number }[] = [
  { label: "7 days",  value: "7d",  ms: 7  * 24 * 60 * 60 * 1000 },
  { label: "30 days", value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "All time",value: "all", ms: 0  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function timeAgo(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-background/95 backdrop-blur px-3 py-2 shadow-xl text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-foreground font-semibold">
          {p.name === "revenue" ? inr(p.value) : `${p.value} orders`}
        </p>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsTab() {
  const [range, setRange] = useState<Range>("30d");
  const rangeMs = RANGES.find((r) => r.value === range)!.ms;
  const data = useQuery(api.analytics.getSalesData, { rangeMs });

  const isLoading = data === undefined;

  return (
    <div className="space-y-6 pb-12">
      {/* Header + range picker */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Sales Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Revenue and order data for paid orders</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={inr(data.totalRevenueInr)}
            sub="from paid orders"
            icon={IndianRupee}
            color="bg-primary/15 text-primary"
          />
          <StatCard
            label="Paid Orders"
            value={data.totalOrders.toLocaleString()}
            sub={data.totalOrders === 1 ? "order" : "orders completed"}
            icon={ShoppingBag}
            color="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            label="Avg. Order Value"
            value={inr(data.avgOrderValueInr)}
            sub="per paid order"
            icon={TrendingUp}
            color="bg-violet-500/15 text-violet-400"
          />
          <StatCard
            label="Items Sold"
            value={data.totalItemsSold.toLocaleString()}
            sub="across all orders"
            icon={Package}
            color="bg-cyan-500/15 text-cyan-400"
          />
        </div>
      )}

      {/* Revenue chart */}
      <div className="rounded-2xl border border-white/8 bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Revenue over time</p>
        <p className="text-xs text-muted-foreground mb-5">Daily revenue in ₹ (INR)</p>
        {isLoading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : data.revenueByDay.length === 0 ? (
          <div className="h-56 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No paid orders in this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.revenueByDay} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="oklch(0.78 0.18 55)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="oklch(0.78 0.18 55)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(d: string) => {
                  const [, m, day] = d.split("-");
                  return `${day}/${m}`;
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="oklch(0.78 0.18 55)"
                strokeWidth={2}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "oklch(0.78 0.18 55)", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders bar chart */}
      <div className="rounded-2xl border border-white/8 bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Orders per day</p>
        <p className="text-xs text-muted-foreground mb-5">Number of paid orders each day</p>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : data.revenueByDay.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.revenueByDay} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(d: string) => {
                  const [, m, day] = d.split("-");
                  return `${day}/${m}`;
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="orders"
                fill="oklch(0.6 0.15 280)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom row: top products + recent orders */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top products */}
        <div className="rounded-2xl border border-white/8 bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Top products by revenue</p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : data.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No data for this period</p>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((p, i) => {
                const maxRev = data.topProducts[0]?.revenueInr ?? 1;
                const pct = Math.round((p.revenueInr / maxRev) * 100);
                return (
                  <div key={p.productId} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground/60 w-4 shrink-0">#{i + 1}</span>
                        <p className="text-xs font-medium text-foreground truncate">{p.productName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{p.unitsSold} sold</span>
                        <span className="text-xs font-semibold text-primary">{inr(p.revenueInr)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl border border-white/8 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-sm font-semibold text-foreground">Recent activity</p>
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No paid orders yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.map((o) => (
                <div key={o._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-background/50">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{o.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {o.orderNumber} · {o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-primary">{inr(o.amountInr)}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(o._creationTime)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
