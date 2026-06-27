"use client";

import { useEffect, useState } from "react";
import {
  fetchStats, fetchCategoryAnalytics, fetchMarketAnalytics,
  fetchWebsiteAnalytics, fetchRevenueByMonth,
  type CrmDashboardStats, type CategoryAnalytics,
  type MarketAnalytics, type RevenueByMonth, type WebsiteAnalyticsStats,
} from "@/lib/api";
import { BarChart2, Globe, MapPin, TrendingUp, Target, RefreshCw } from "lucide-react";

// ─── SVG bar chart ────────────────────────────────────────────────────────────

function BarChart({ data, color = "#3b82f6" }: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  if (!data.length) return <p className="py-6 text-center text-sm text-slate-400">No data yet</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map(({ label, value }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="truncate text-xs font-medium text-slate-700 max-w-[180px]">{label}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-600">{value.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutSlices({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="py-6 text-center text-sm text-slate-400">No data yet</p>;
  return (
    <div className="flex flex-col gap-2">
      {data.slice(0, 8).map(({ label, value }, i) => {
        const pct = Math.round((value / total) * 100);
        return (
          <div key={label} className="flex items-center gap-2.5">
            <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="flex-1 truncate text-xs text-slate-600">{label}</span>
            <span className="text-xs font-semibold text-slate-700">{pct}%</span>
            <span className="text-[10px] text-slate-400">({value})</span>
          </div>
        );
      })}
    </div>
  );
}

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6"];

function Section({ title, icon: Icon, children, cols = 1 }: {
  title: string; icon: React.ElementType; children: React.ReactNode; cols?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${color}`}>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ─── Revenue sparkline ────────────────────────────────────────────────────────

function RevenueLine({ data }: { data: RevenueByMonth[] }) {
  if (!data.length) return <p className="py-6 text-center text-sm text-slate-400">No won deals yet</p>;
  const W = 560; const H = 120; const PAD = 12;
  const chartW = W - PAD * 2; const chartH = H - PAD * 2 - 20;
  const max = Math.max(...data.map(d => Number(d.revenue)), 1);
  const barW = Math.min(40, (chartW / data.length) * 0.6);
  const gap = chartW / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((d, i) => {
        const rev = Number(d.revenue);
        const bh = Math.max(3, (rev / max) * chartH);
        const x = PAD + i * gap + (gap - barW) / 2;
        const y = PAD + chartH - bh;
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barW} height={bh} rx="3" fill="#22c55e" opacity="0.85" />
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {d.month.slice(2, 7)}
            </text>
            {rev > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="7.5" fill="#15803d" fontWeight="600">
                €{rev >= 1000 ? `${(rev/1000).toFixed(0)}k` : rev}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [stats, setStats]     = useState<CrmDashboardStats | null>(null);
  const [cats, setCats]       = useState<CategoryAnalytics[]>([]);
  const [markets, setMarkets] = useState<MarketAnalytics[]>([]);
  const [webStats, setWeb]    = useState<WebsiteAnalyticsStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueByMonth[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    await Promise.all([
      fetchStats().then(setStats).catch(() => null),
      fetchCategoryAnalytics().then(setCats).catch(() => null),
      fetchMarketAnalytics().then(setMarkets).catch(() => null),
      fetchWebsiteAnalytics().then(setWeb).catch(() => null),
      fetchRevenueByMonth().then(setRevenue).catch(() => null),
    ]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── derived ──────────────────────────────────────────────────────────────

  const websiteStatusData = stats ? [
    { label: "No Website",    value: stats.no_website },
    { label: "Facebook Only", value: stats.facebook_only },
    { label: "Free Builder",  value: stats.free_builder },
  ] : [];

  const funnelData = stats ? [
    { label: "Total Calls",     value: stats.total_calls },
    { label: "Interested",      value: stats.interested },
    { label: "Proposal Sent",   value: stats.proposals_sent },
    { label: "Won",             value: stats.deals_won },
  ] : [];

  const topCats = [...cats]
    .sort((a, b) => b.opportunities - a.opportunities)
    .slice(0, 10)
    .map(c => ({ label: c.category, value: c.opportunities }));

  const topCities = [...markets]
    .sort((a, b) => b.opportunities - a.opportunities)
    .slice(0, 10)
    .map(m => ({ label: m.city, value: m.opportunities }));

  const cmsData = webStats?.platform_distribution
    ? Object.entries(webStats.platform_distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, value]) => ({ label, value }))
    : [];

  const conversionData = stats && stats.total_calls > 0 ? [
    { label: "Call → Interested", value: stats.call_to_interested_rate },
    { label: "Interested → Proposal", value: stats.interested_to_proposal_rate },
    { label: "Proposal → Won", value: stats.proposal_to_won_rate },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">Full CRM intelligence — leads, conversions, revenue</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary pills */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              <StatPill label="Total Opps"     value={stats.total_opportunities} color="bg-blue-50" />
              <StatPill label="No Website"     value={stats.no_website}          color="bg-red-50" />
              <StatPill label="Facebook Only"  value={stats.facebook_only}       color="bg-orange-50" />
              <StatPill label="Free Builder"   value={stats.free_builder}        color="bg-amber-50" />
              <StatPill label="Total Calls"    value={stats.total_calls}         color="bg-purple-50" />
              <StatPill label="Deals Won"      value={stats.deals_won}           color="bg-green-50" />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue trend */}
            <Section title="Revenue by Month" icon={TrendingUp}>
              <RevenueLine data={revenue} />
            </Section>

            {/* Conversion rates */}
            <Section title="Conversion Rates" icon={Target}>
              {conversionData.length ? (
                <div className="space-y-4">
                  {conversionData.map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600">{label}</span>
                        <span className={`text-sm font-bold ${value >= 50 ? "text-green-600" : value >= 20 ? "text-amber-600" : "text-slate-600"}`}>
                          {value}%
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className={`h-3 rounded-full transition-all ${value >= 50 ? "bg-green-500" : value >= 20 ? "bg-amber-500" : "bg-slate-400"}`}
                          style={{ width: `${Math.min(value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">No conversion data yet — start making calls</p>
              )}
            </Section>

            {/* Sales funnel */}
            <Section title="Sales Funnel" icon={BarChart2}>
              <BarChart data={funnelData} color="#8b5cf6" />
            </Section>

            {/* Website opportunity distribution */}
            <Section title="Opportunity Distribution" icon={Globe}>
              <BarChart data={websiteStatusData} color="#ef4444" />
            </Section>

            {/* Top categories */}
            <Section title="Top Categories by Opportunities" icon={BarChart2}>
              <BarChart data={topCats} color="#3b82f6" />
            </Section>

            {/* Top cities */}
            <Section title="Top Cities by Opportunities" icon={MapPin}>
              <BarChart data={topCities} color="#22c55e" />
            </Section>
          </div>

          {/* CMS / Platform distribution */}
          {cmsData.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="CMS Platform Distribution" icon={Globe}>
                <DonutSlices data={cmsData} colors={COLORS} />
              </Section>

              {webStats && (
                <Section title="Website Health Scores" icon={Target}>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Avg Health Score",   value: `${webStats.avg_health_score}/100`,   color: webStats.avg_health_score >= 70 ? "text-green-600" : "text-amber-600" },
                      { label: "Avg SEO Score",      value: `${webStats.avg_seo_score}/100`,      color: webStats.avg_seo_score >= 60 ? "text-green-600" : "text-red-600" },
                      { label: "Avg Redesign Score", value: `${webStats.avg_redesign_score}/100`, color: webStats.avg_redesign_score >= 60 ? "text-red-600" : "text-green-600" },
                      { label: "Opportunity Rate",   value: `${webStats.opportunity_rate}%`,       color: "text-blue-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-4 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}

          {/* Revenue by city + category tables */}
          {markets.filter(m => m.revenue_won > 0).length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="Revenue by City" icon={MapPin}>
                <BarChart
                  data={[...markets].filter(m => m.revenue_won > 0).sort((a, b) => b.revenue_won - a.revenue_won).slice(0, 8).map(m => ({ label: m.city, value: m.revenue_won }))}
                  color="#22c55e"
                />
              </Section>
              <Section title="Revenue by Category" icon={BarChart2}>
                <BarChart
                  data={[...cats].filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8).map(c => ({ label: c.category, value: c.revenue }))}
                  color="#8b5cf6"
                />
              </Section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
