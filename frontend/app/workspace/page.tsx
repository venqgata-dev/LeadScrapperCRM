"use client";

import { useEffect, useState } from "react";
import {
  fetchWorkspaceStats,
  fetchHotLeads,
  fetchBusinesses,
  fetchPlaybooks,
  type WorkspaceStats,
  type Business,
  type SalesPlaybook,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { StatCard, KpiTile, LoadingSkeleton, ErrorCard, EmptyState } from "@/components/ui";
import {
  Phone, Users, TrendingUp, DollarSign, AlertCircle, Calendar,
  CheckCircle, XCircle, Flame, FileText, BarChart2, BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";

export default function WorkspacePage() {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [hotLeads, setHotLeads] = useState<Business[]>([]);
  const [dueToday, setDueToday] = useState<Business[]>([]);
  const [playbooks, setPlaybooks] = useState<SalesPlaybook[]>([]);
  const [expandedPb, setExpandedPb] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const [s, h, allFollowUp, pbs] = await Promise.all([
        fetchWorkspaceStats(),
        fetchHotLeads(),
        fetchBusinesses({ contact_status: "FOLLOW_UP" }),
        fetchPlaybooks(true),
      ]);
      setStats(s);
      setHotLeads(h);
      setPlaybooks(pbs);
      // Filter to leads with follow_up_date today or overdue
      const due = allFollowUp.filter((b) => {
        if (!b.follow_up_date) return false;
        return b.follow_up_date.split("T")[0] <= todayStr;
      });
      setDueToday(due.slice(0, 10));
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

      {/* Today's Follow-ups */}
      {dueToday.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Due for a Call
            <span className="ml-2 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs">{dueToday.length}</span>
          </h2>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {dueToday.map((b) => {
              const overdue = b.follow_up_date && b.follow_up_date.split("T")[0] < new Date().toISOString().split("T")[0];
              return (
                <div key={b.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <Calendar className={`h-4 w-4 shrink-0 ${overdue ? "text-red-500" : "text-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <a href={`/leads/${b.id}`} className="font-medium text-slate-900 hover:text-blue-600 text-sm">{b.name}</a>
                    <p className="text-xs text-slate-500">{b.city} · {b.category}</p>
                  </div>
                  {overdue && (
                    <span className="text-xs font-semibold bg-red-100 text-red-700 rounded-full px-2 py-0.5">Overdue</span>
                  )}
                  {b.phone && (
                    <a href={`tel:${b.phone}`} className="text-blue-600 hover:text-blue-800">
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Active Playbooks */}
      {playbooks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Active Playbooks
          </h2>
          <div className="space-y-2">
            {playbooks.map((pb) => {
              const isOpen = expandedPb.has(pb.id);
              return (
                <div key={pb.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedPb((prev) => {
                      const next = new Set(prev);
                      if (next.has(pb.id)) next.delete(pb.id); else next.add(pb.id);
                      return next;
                    })}
                  >
                    <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="flex-1 font-medium text-slate-900 text-sm">{pb.name}</span>
                    {pb.applies_to.length > 0 && (
                      <span className="text-xs text-slate-500 hidden sm:inline">{pb.applies_to.slice(0, 3).join(", ")}</span>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-2 text-sm">
                      {pb.opening && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Opening</p>
                          <p className="text-slate-700">{pb.opening}</p>
                        </div>
                      )}
                      {pb.questions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Key Questions</p>
                          <ul className="space-y-0.5">
                            {pb.questions.slice(0, 5).map((q, i) => <li key={i} className="text-slate-700">• {q}</li>)}
                          </ul>
                        </div>
                      )}
                      <a href="/playbooks" className="inline-block text-xs text-blue-600 hover:underline mt-1">View all playbooks →</a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

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
