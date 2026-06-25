"use client";

import { useEffect, useState } from "react";
import {
  fetchStats,
  fetchCategoryAnalytics,
  fetchMarketAnalytics,
  fetchRevenueByMonth,
  type CrmDashboardStats,
  type CategoryAnalytics,
  type MarketAnalytics,
  type RevenueByMonth,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Phone, TrendingUp, Star, FileText, Trophy, Banknote,
  Target, Globe, BarChart2, MapPin, ArrowRight,
} from "lucide-react";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FunnelCard({
  label, value, color,
}: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-center text-xs text-slate-500 leading-tight">{label}</span>
    </div>
  );
}

// ─── Revenue by Month chart (SVG) ────────────────────────────────────────────

function RevenueMonthChart({ data }: { data: RevenueByMonth[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No won deals recorded yet
      </div>
    );
  }

  const W = 560; const H = 160; const PAD = { l: 8, r: 8, t: 8, b: 28 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const barW = Math.min(48, (chartW / data.length) * 0.65);
  const gap = chartW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((d, i) => {
        const barH = Math.max(4, (d.revenue / maxRev) * chartH);
        const x = PAD.l + i * gap + (gap - barW) / 2;
        const y = PAD.t + chartH - barH;
        const label = d.month.slice(0, 7); // YYYY-MM
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barW} height={barH}
              rx="4" fill="#22c55e" opacity="0.85" />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle"
              fontSize="9" fill="#94a3b8">{label}</text>
            {d.revenue > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                fontSize="8" fill="#15803d" fontWeight="600">
                £{Math.round(d.revenue / 1000) > 0
                  ? `${(d.revenue / 1000).toFixed(1)}k`
                  : d.revenue.toFixed(0)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Horizontal bar chart (city / category) ──────────────────────────────────

function HBarChart({
  rows, valueKey, labelKey, color,
}: {
  rows: Record<string, number | string>[];
  valueKey: string;
  labelKey: string;
  color: string;
}) {
  const values = rows.map((r) => Number(r[valueKey]));
  const max = Math.max(...values, 1);
  if (values.every((v) => v === 0)) {
    return <p className="py-4 text-center text-sm text-slate-400">No revenue recorded yet</p>;
  }
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const v = Number(r[valueKey]);
        const pct = Math.round((v / max) * 100);
        return (
          <div key={String(r[labelKey])}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-slate-700">{r[labelKey]}</span>
              <span className="shrink-0 text-xs font-semibold text-slate-600">
                {v > 0 ? formatCurrency(v) : "—"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CrmDashboardPage() {
  const [stats, setStats] = useState<CrmDashboardStats | null>(null);
  const [categories, setCategories] = useState<CategoryAnalytics[]>([]);
  const [markets, setMarkets] = useState<MarketAnalytics[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<RevenueByMonth[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats().then(setStats).catch((e) => setError(String(e)));
    fetchCategoryAnalytics().then(setCategories).catch(() => null);
    fetchMarketAnalytics().then(setMarkets).catch(() => null);
    fetchRevenueByMonth().then(setMonthlyRevenue).catch(() => null);
  }, []);

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  }

  // Derived data for charts — guard against non-array state if API shape changes
  const marketsArr = Array.isArray(markets) ? markets : [];
  const categoriesArr = Array.isArray(categories) ? categories : [];

  const topMarketsByRevenue = [...marketsArr]
    .filter((m) => m.revenue_won > 0)
    .sort((a, b) => b.revenue_won - a.revenue_won)
    .slice(0, 8);

  const topCategoriesByRevenue = [...categoriesArr]
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const topMarketsByRate = [...marketsArr]
    .sort((a, b) => b.opportunity_rate - a.opportunity_rate)
    .slice(0, 5);

  const topCategoriesByOpps = [...categoriesArr]
    .sort((a, b) => b.opportunities - a.opportunities)
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">CRM Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Sales pipeline and revenue intelligence</p>
      </div>

      {/* ── Revenue hero ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-green-200">Total Revenue Won</p>
          <p className="mt-1 text-4xl font-bold">{stats ? formatCurrency(stats.revenue_won) : "—"}</p>
          <p className="mt-1 text-sm text-green-200">
            {stats ? `${stats.deals_won} deal${stats.deals_won !== 1 ? "s" : ""} closed` : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-slate-500">Revenue This Month</p>
          <p className="text-3xl font-bold text-slate-900">
            {stats ? formatCurrency(stats.revenue_this_month) : "—"}
          </p>
          <p className="text-xs text-slate-400">Calendar month to date</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-slate-500">Last 30 Days</p>
          <p className="text-3xl font-bold text-slate-900">
            {stats ? formatCurrency(stats.revenue_last_30_days) : "—"}
          </p>
          <p className="text-xs text-slate-400">Rolling 30-day window</p>
        </div>
      </div>

      {/* ── Revenue Intelligence metrics ── */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Revenue Intelligence</h2>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: "Avg Deal Value",
              value: stats ? formatCurrency(stats.avg_deal_value) : "—",
              color: "text-green-700", bg: "bg-green-50",
            },
            {
              label: "Call → Interested",
              value: stats ? `${stats.call_to_interested_rate}%` : "—",
              color: stats && stats.call_to_interested_rate >= 20 ? "text-green-700" : "text-slate-600",
              bg: stats && stats.call_to_interested_rate >= 20 ? "bg-green-50" : "bg-slate-50",
            },
            {
              label: "Interested → Proposal",
              value: stats ? `${stats.interested_to_proposal_rate}%` : "—",
              color: stats && stats.interested_to_proposal_rate >= 50 ? "text-green-700" : "text-slate-600",
              bg: stats && stats.interested_to_proposal_rate >= 50 ? "bg-green-50" : "bg-slate-50",
            },
            {
              label: "Proposal → Won",
              value: stats ? `${stats.proposal_to_won_rate}%` : "—",
              color: stats && stats.proposal_to_won_rate >= 50 ? "text-green-700" : "text-slate-600",
              bg: stats && stats.proposal_to_won_rate >= 50 ? "bg-green-50" : "bg-slate-50",
            },
            {
              label: "Revenue This Month",
              value: stats ? formatCurrency(stats.revenue_this_month) : "—",
              color: "text-blue-700", bg: "bg-blue-50",
            },
            {
              label: "Last 30 Days",
              value: stats ? formatCurrency(stats.revenue_last_30_days) : "—",
              color: "text-indigo-700", bg: "bg-indigo-50",
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl ${bg} px-3 py-3 text-center`}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue charts ── */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Revenue Charts</h2>
      <div className="mb-6 grid gap-4 lg:grid-cols-3">

        {/* Revenue by Month */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-700">Revenue by Month</h3>
            {monthlyRevenue.length > 0 && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                {monthlyRevenue.length} month{monthlyRevenue.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <RevenueMonthChart data={monthlyRevenue} />
        </div>

        {/* Revenue by City */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-700">Revenue by City</h3>
          </div>
          <HBarChart
            rows={topMarketsByRevenue as unknown as Record<string, number | string>[]}
            labelKey="city"
            valueKey="revenue_won"
            color="bg-blue-500"
          />
        </div>

        {/* Revenue by Category */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-700">Revenue by Category</h3>
          </div>
          <HBarChart
            rows={topCategoriesByRevenue as unknown as Record<string, number | string>[]}
            labelKey="category"
            valueKey="revenue"
            color="bg-purple-500"
          />
        </div>

        {/* Conversion funnel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Sales Funnel</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FunnelCard label="Total Calls" value={stats?.total_calls ?? "—"} color="text-blue-700" />
            <FunnelCard label="Interested" value={stats?.interested ?? "—"} color="text-purple-700" />
            <FunnelCard label="Proposals" value={stats?.proposals_sent ?? "—"} color="text-indigo-700" />
            <FunnelCard label="Won" value={stats?.deals_won ?? "—"} color="text-green-700" />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2">
            <span className="text-xs text-slate-500">Call → Won</span>
            <span className={`text-sm font-bold ${
              stats && stats.call_to_interested_rate >= 10 ? "text-green-700" : "text-slate-400"
            }`}>
              {stats && stats.total_calls > 0
                ? `${Math.round((stats.deals_won / stats.total_calls) * 100)}%`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Performing Markets ── */}
      {topMarketsByRate.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Top Performing Markets
          </h2>
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">City</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Opportunities</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Opp. Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Revenue Won</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topMarketsByRate.map((m, i) => (
                  <tr key={m.city} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      <span className="mr-2 text-xs text-slate-400">#{i + 1}</span>
                      {m.city}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{m.opportunities}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-bold ${
                        m.opportunity_rate >= 30 ? "text-green-700" :
                        m.opportunity_rate >= 15 ? "text-amber-600" : "text-slate-400"
                      }`}>
                        {m.opportunity_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                      {m.revenue_won > 0 ? formatCurrency(m.revenue_won) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {markets.length > 5 && (
              <div className="border-t border-slate-100 px-4 py-2.5 text-right">
                <button
                  onClick={() => {/* handled by expanding state if needed */}}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {markets.length - 5} more cities ↓
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Top Performing Categories ── */}
      {topCategoriesByOpps.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Top Performing Categories
          </h2>
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Opportunities</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Won Deals</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCategoriesByOpps.map((c, i) => (
                  <tr key={c.category} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      <span className="mr-2 text-xs text-slate-400">#{i + 1}</span>
                      {c.category}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{c.opportunities}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-semibold ${c.won_deals > 0 ? "text-green-700" : "text-slate-400"}`}>
                        {c.won_deals}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                      {c.revenue > 0 ? formatCurrency(c.revenue) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Pipeline stats ── */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Sales Pipeline</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Calls Today" value={stats?.calls_today ?? "—"} icon={Phone} accent="bg-blue-50 text-blue-600" />
        <StatCard label="Interested" value={stats?.interested ?? "—"} sub="replied positively" icon={Star} accent="bg-purple-50 text-purple-600" />
        <StatCard label="Proposals Sent" value={stats?.proposals_sent ?? "—"} sub="awaiting decision" icon={FileText} accent="bg-indigo-50 text-indigo-600" />
        <StatCard label="Deals Won" value={stats?.deals_won ?? "—"} sub="this pipeline" icon={Trophy} accent="bg-green-50 text-green-600" />
      </div>

      {/* ── Opportunity pool ── */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Opportunity Pool</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Opportunities" value={stats?.total_opportunities ?? "—"} sub="no proper website" icon={Target} accent="bg-slate-100 text-slate-600" />
        <StatCard label="No Website" value={stats?.no_website ?? "—"} icon={Globe} accent="bg-red-50 text-red-600" />
        <StatCard label="Facebook Only" value={stats?.facebook_only ?? "—"} icon={TrendingUp} accent="bg-orange-50 text-orange-600" />
        <StatCard label="Free Builder" value={stats?.free_builder ?? "—"} sub="Wix / Weebly" icon={Globe} accent="bg-amber-50 text-amber-600" />
      </div>

      {/* ── Quick links ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <a href="/pipeline" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <p className="font-semibold text-slate-900">View Pipeline</p>
          <p className="mt-0.5 text-sm text-slate-500">Kanban board by sales stage</p>
        </a>
        <a href="/leads" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <p className="font-semibold text-slate-900">All Leads</p>
          <p className="mt-0.5 text-sm text-slate-500">Browse and filter every contact</p>
        </a>
        <a href="/" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <p className="font-semibold text-slate-900">Find More Leads</p>
          <p className="mt-0.5 text-sm text-slate-500">Search for new opportunities</p>
        </a>
      </div>
    </div>
  );
}
