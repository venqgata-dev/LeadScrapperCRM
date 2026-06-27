"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, Trophy, XCircle, DollarSign, Plus, Filter,
  Building2, Calendar, User, ChevronRight, Target,
} from "lucide-react";
import {
  fetchDeals, fetchDealStats, type Deal, type DealStats,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:      { label: "Open",      color: "text-blue-700",  bg: "bg-blue-100" },
  WON:       { label: "Won",       color: "text-green-700", bg: "bg-green-100" },
  LOST:      { label: "Lost",      color: "text-red-700",   bg: "bg-red-100" },
  CANCELLED: { label: "Cancelled", color: "text-slate-600", bg: "bg-slate-100" },
};

const FILTERS = ["ALL", "OPEN", "WON", "LOST", "CANCELLED"] as const;

function fmt(v: string | null | undefined) {
  if (!v) return "—";
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `€${n.toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [deals, setDeals]       = useState<Deal[]>([]);
  const [stats, setStats]       = useState<DealStats | null>(null);
  const [filter, setFilter]     = useState<string>("ALL");
  const [loading, setLoading]   = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([fetchDeals(), fetchDealStats()]);
      setDeals(d);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = filter === "ALL" ? deals : deals.filter(d => d.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
          <p className="mt-0.5 text-sm text-slate-500">Track every opportunity from first contact to close</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard label="Open Deals"         value={stats.open}            icon={Target}     accent="bg-blue-100 text-blue-600" />
          <StatCard label="Won This Month"     value={stats.won_this_month}  icon={Trophy}     accent="bg-green-100 text-green-600" />
          <StatCard label="Lost This Month"    value={stats.lost_this_month} icon={XCircle}    accent="bg-red-100 text-red-600" />
          <StatCard label="Pipeline Value"     value={fmt(String(stats.pipeline_value))}     icon={TrendingUp} accent="bg-amber-100 text-amber-600" sub="probability-weighted" />
          <StatCard label="Revenue Won (mo.)"  value={fmt(String(stats.revenue_won_this_month))} icon={DollarSign} accent="bg-violet-100 text-violet-600" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "ALL" ? "All Deals" : STATUS_META[f].label}
            {f !== "ALL" && (
              <span className="ml-1.5 opacity-70">{deals.filter(d => d.status === f).length}</span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{visible.length} deal{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-400">
          <Target className="mb-3 h-12 w-12 opacity-30" />
          <p className="text-base font-medium">No deals yet</p>
          <p className="text-sm">Create a deal from any lead's detail page</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Deal</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Probability</th>
                <th className="px-4 py-3">Close Date</th>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(d => {
                const meta = STATUS_META[d.status] ?? STATUS_META.OPEN;
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/deals/${d.id}`} className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                        {d.deal_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {d.business_name ? (
                        <Link href={`/leads/${d.business_id}`} className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {d.business_name}
                        </Link>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{fmt(d.estimated_value)}</td>
                    <td className="px-4 py-3">
                      {d.probability != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-slate-200">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${d.probability}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{d.probability}%</span>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {fmtDate(d.actual_close_date ?? d.expected_close_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {d.salesperson ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/deals/${d.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
