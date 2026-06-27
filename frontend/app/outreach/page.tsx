"use client";

import { useEffect, useState } from "react";
import {
  SalesCampaign,
  SalesCampaignCreate,
  OutreachAnalytics,
  ScriptBatchStatus,
  createOutreachCampaign as createCampaign,
  deleteOutreachCampaign as deleteCampaign,
  fetchOutreachCampaigns as fetchCampaigns,
  fetchOutreachAnalytics,
  fetchScriptBatchStatus,
  generateAllScripts,
  generateMissingScripts,
  pauseScripts,
  resumeScripts,
  stopScripts,
} from "@/lib/api";

const CAMPAIGN_TYPES = ["MIXED", "COLD_CALL", "EMAIL", "FACEBOOK", "LINKEDIN"];

const TYPE_LABELS: Record<string, string> = {
  MIXED: "Mixed (Call + Email)",
  COLD_CALL: "Cold Calling",
  EMAIL: "Email",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([]);
  const [analytics, setAnalytics] = useState<OutreachAnalytics | null>(null);
  const [status, setStatus] = useState<ScriptBatchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<SalesCampaignCreate>({
    name: "",
    campaign_type: "MIXED",
    country: "",
    category: "",
    min_ai_score: 0,
    min_project_value: 0,
    min_close_probability: 0,
    max_businesses: 500,
  });

  async function load() {
    try {
      const [c, a, s] = await Promise.all([
        fetchCampaigns(),
        fetchOutreachAnalytics(),
        fetchScriptBatchStatus(),
      ]);
      setCampaigns(c);
      setAnalytics(a);
      setStatus(s);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [status?.running]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createCampaign({
        ...form,
        country: form.country || null,
        category: form.category || null,
      });
      setShowCreate(false);
      setForm({ name: "", campaign_type: "MIXED", country: "", category: "", min_ai_score: 0, min_project_value: 0, min_close_probability: 0, max_businesses: 500 });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this campaign and all its tasks?")) return;
    await deleteCampaign(id);
    await load();
  }

  const pct = status && status.total > 0 ? Math.round((status.processed / status.total) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered sales automation engine</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + New Campaign
        </button>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Campaigns" value={analytics.total_campaigns} sub={`${analytics.active_campaigns} active`} />
          <StatCard label="Total Tasks" value={analytics.total_tasks.toLocaleString()} sub={`${analytics.pending_tasks} pending`} />
          <StatCard label="Today's Tasks" value={analytics.tasks_today.toLocaleString()} />
          <StatCard label="Call Scripts" value={analytics.scripts_generated.toLocaleString()} />
          <StatCard label="Emails Drafted" value={analytics.emails_drafted.toLocaleString()} />
          <StatCard label="Follow-ups" value={analytics.follow_ups_pending.toLocaleString()} sub="pending" />
        </div>
      )}

      {/* Script generation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900">AI Script &amp; Email Generation</h2>
            <p className="text-xs text-gray-500">Generate personalised call scripts and email drafts for every business</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {status?.running ? (
              <>
                <button onClick={() => pauseScripts().then(load)} className="px-3 py-1.5 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Pause</button>
                <button onClick={() => stopScripts().then(load)} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Stop</button>
              </>
            ) : status?.paused ? (
              <>
                <button onClick={() => resumeScripts().then(load)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Resume</button>
                <button onClick={() => stopScripts().then(load)} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Stop</button>
              </>
            ) : (
              <>
                <button onClick={() => generateMissingScripts(true).then(load)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Generate Missing</button>
                <button onClick={() => generateAllScripts(true).then(load)} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700">Regenerate All</button>
              </>
            )}
          </div>
        </div>

        {status && (status.running || status.paused) && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{status.current_business ?? "Processing…"}</span>
              <span>{status.processed} / {status.total} ({pct}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mt-2">
              <span>Scripts: {status.scripts_generated.toLocaleString()}</span>
              <span>Emails: {status.emails_generated.toLocaleString()}</span>
              <span>{status.elapsed_seconds}s elapsed</span>
            </div>
          </div>
        )}

        {status && !status.running && !status.paused && (
          <div className="flex gap-6 text-sm text-gray-600">
            <span>Scripts generated: <strong>{status.scripts_generated.toLocaleString()}</strong></span>
            <span>Emails drafted: <strong>{status.emails_generated.toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* Campaigns list */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 mb-2">No campaigns yet</p>
          <p className="text-sm text-gray-400">Create a campaign to auto-generate tasks for your best leads.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700"}`}>{c.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{TYPE_LABELS[c.campaign_type] ?? c.campaign_type}</span>
                  </div>
                  {c.description && <p className="text-sm text-gray-500 mb-2">{c.description}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {c.country && <span>Country: {c.country}</span>}
                    {c.category && <span>Category: {c.category}</span>}
                    {c.min_ai_score > 0 && <span>Min Score: {c.min_ai_score}</span>}
                    {c.min_project_value > 0 && <span>Min Value: £{c.min_project_value.toLocaleString()}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(c.id)} className="ml-4 text-xs text-red-400 hover:text-red-600 flex-shrink-0">Delete</button>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                {[
                  { label: "Targets", value: c.target_count },
                  { label: "Tasks", value: c.task_count },
                  { label: "Pending", value: c.pending_tasks },
                  { label: "Completed", value: c.completed_tasks },
                  { label: "Contacted", value: c.contacted_count },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-gray-900">{value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <a href={`/tasks?campaign=${c.id}`} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">View Tasks</a>
                <a href={`/call-queue?campaign=${c.id}`} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Call Queue</a>
                <a href={`/email-queue?campaign=${c.id}`} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">Email Queue</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Outreach Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. UK Restaurants Q3" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country filter</label>
                  <input value={form.country ?? ""} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. UK" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category filter</label>
                  <input value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. restaurant" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min AI Score</label>
                  <input type="number" min={0} max={100} value={form.min_ai_score} onChange={e => setForm(f => ({ ...f, min_ai_score: +e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Value (£)</label>
                  <input type="number" min={0} value={form.min_project_value} onChange={e => setForm(f => ({ ...f, min_project_value: +e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Close %</label>
                  <input type="number" min={0} max={100} value={form.min_close_probability} onChange={e => setForm(f => ({ ...f, min_close_probability: +e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max businesses (up to 5,000)</label>
                <input type="number" min={1} max={5000} value={form.max_businesses} onChange={e => setForm(f => ({ ...f, max_businesses: +e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {creating ? "Creating…" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
