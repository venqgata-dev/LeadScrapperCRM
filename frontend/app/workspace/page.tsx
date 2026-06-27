"use client";

import { useEffect, useState } from "react";
import {
  fetchWorkspaceStats,
  fetchHotLeads,
  type WorkspaceStats,
  type Business,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { StatCard, KpiTile, LoadingSkeleton, ErrorCard, EmptyState } from "@/components/ui";
import {
  Phone, Users, TrendingUp, DollarSign, AlertCircle, Calendar,
  CheckCircle, XCircle, Flame, FileText, BarChart2
} from "lucide-react";

export default function WorkspacePage() {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [hotLeads, setHotLeads] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([fetchWorkspaceStats(), fetchHotLeads()]);
      setStats(s);
      setHotLeads(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSkeleton type="grid" rows={6} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!stats) return null;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Daily Sales Workspace</h1>
        <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Today at a glance */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Today at a Glance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiTile label="Calls Today" value={stats.calls_today} color="blue" className="col-span-1" />
          <KpiTile
            label="Follow-ups"
            value={stats.follow_ups_today}
            color={stats.follow_ups_overdue > 0 ? "red" : "green"}
            subLabel={stats.follow_ups_overdue > 0 ? `${stats.follow_ups_overdue} overdue` : undefined}
          />
          <KpiTile label="Won Today" value={stats.won_today} color="emerald" />
          <KpiTile label="Lost Today" value={stats.lost_today} color="slate" />
          <KpiTile label="HOT Leads" value={stats.hot_leads} color="amber" />
          <KpiTile label="Negotiating" value={stats.in_negotiation} color="purple" />
          <KpiTile label="Proposals Out" value={stats.proposals_waiting} color="purple" />
          <KpiTile label="Pipeline" value={formatCurrency(stats.total_pipeline_value)} color="green" />
        </div>
      </section>

      {/* HOT Leads */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">HOT Leads — Call Now</h2>
        {hotLeads.length === 0 ? (
          <EmptyState icon={Flame} title="No HOT leads right now" description="Run AI analysis to score your leads." />
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {hotLeads.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={`/leads/${b.id}`} className="font-medium text-slate-900 hover:text-blue-600 text-sm">{b.name}</a>
                  <p className="text-xs text-slate-500">{b.city} · {b.category}</p>
                </div>
                <span className="text-xs font-semibold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                  Score {b.ai_score}
                </span>
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manager Dashboard */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Manager Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Calls This Week" value={stats.calls_this_week} icon={Phone} color="blue"
            subLabel={`vs ${stats.calls_last_week} last week`}
            trend={stats.calls_this_week - stats.calls_last_week}
          />
          <StatCard label="Win Rate" value={`${stats.win_rate}%`} icon={TrendingUp} color="green" />
          <StatCard label="Overdue Follow-ups" value={`${stats.overdue_follow_ups_pct}%`} icon={AlertCircle}
            color={stats.overdue_follow_ups_pct > 20 ? "red" : "amber"}
          />
          <StatCard label="Top Category" value={stats.top_category || "—"} icon={BarChart2} color="purple" />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2">Calls → Interested</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats.calls_to_interested_rate}%</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2">Interested → Proposal</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats.interested_to_proposal_rate}%</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2">Proposal → Won</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats.proposal_to_won_rate}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "All Leads", href: "/leads", icon: Users, color: "bg-blue-50 text-blue-700" },
            { label: "Pipeline", href: "/pipeline", icon: TrendingUp, color: "bg-purple-50 text-purple-700" },
            { label: "Playbooks", href: "/playbooks", icon: FileText, color: "bg-amber-50 text-amber-700" },
            { label: "Call Queue", href: "/call-list", icon: Phone, color: "bg-green-50 text-green-700" },
          ].map(({ label, href, icon: Icon, color }) => (
            <a key={href} href={href} className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors ${color}`}>
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
        </div>
      </section>

    </div>
  );
}
