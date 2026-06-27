"use client";

import { useEffect, useState } from "react";
import {
  fetchSalesInsightStatus,
  generateAllSalesInsights,
  generateMissingSalesInsights,
  pauseSalesInsights,
  resumeSalesInsights,
  stopSalesInsights,
  SalesInsightBatchStatus,
} from "@/lib/api";

const PRIORITY_COLOR: Record<string, string> = {
  HOT:       "bg-red-500/20 text-red-300 border-red-500/30",
  WARM:      "bg-amber-500/20 text-amber-300 border-amber-500/30",
  QUALIFIED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  COLD:      "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function SalesIntelligencePage() {
  const [status, setStatus] = useState<SalesInsightBatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const s = await fetchSalesInsightStatus();
      setStatus(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!status?.running) return;
    const id = setInterval(loadStatus, 2000);
    return () => clearInterval(id);
  }, [status?.running]);

  const progress = status && status.total > 0
    ? Math.round((status.processed / status.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">AI Sales Intelligence</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Score every business in your CRM — no API calls, pure data analysis.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats grid */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Businesses in CRM"    value={status.total_businesses} />
            <StatCard label="Insights Generated"   value={status.insights_generated}
              sub={`${Math.round((status.insights_generated / Math.max(1, status.total_businesses)) * 100)}% coverage`} />
            <StatCard label="HOT Leads"            value={status.hot_count}  sub="score ≥ 70" />
            <StatCard label="WARM Leads"           value={status.warm_count} sub="score ≥ 50" />
            <StatCard label="Avg Sales Score"      value={`${status.avg_overall_score}/100`} />
            <StatCard label="Avg Project Value"    value={`£${Math.round(status.avg_project_value).toLocaleString()}`} />
            <StatCard label="Est. Pipeline Value"  value={`£${Math.round(status.avg_project_value * status.insights_generated).toLocaleString()}`}
              sub="sum across all insights" />
            <StatCard label="HOT + WARM"           value={status.hot_count + status.warm_count}
              sub="priority leads" />
          </div>
        )}

        {/* Job progress */}
        {status?.running && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300 font-medium">
                {status.paused ? "Paused" : "Processing..."}&nbsp;
                {status.current_business && (
                  <span className="text-zinc-500">{status.current_business}</span>
                )}
              </span>
              <span className="text-xs text-zinc-500">
                {status.processed}/{status.total} &bull; {status.elapsed_seconds}s
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">{progress}% complete</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => { await generateAllSalesInsights(); await loadStatus(); }}
            disabled={status?.running}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Generate All
          </button>
          <button
            onClick={async () => { await generateMissingSalesInsights(); await loadStatus(); }}
            disabled={status?.running}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Generate Missing
          </button>
          {status?.running && !status.paused && (
            <button
              onClick={async () => { await pauseSalesInsights(); await loadStatus(); }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Pause
            </button>
          )}
          {status?.running && status.paused && (
            <button
              onClick={async () => { await resumeSalesInsights(); await loadStatus(); }}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Resume
            </button>
          )}
          {status?.running && (
            <button
              onClick={async () => { await stopSalesInsights(); await loadStatus(); }}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Stop
            </button>
          )}
          <button
            onClick={loadStatus}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Priority legend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Priority Bands</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: "HOT", range: "Score ≥ 70", desc: "Immediate opportunity — call now" },
              { label: "WARM", range: "Score 50–69", desc: "Good prospect — follow up soon" },
              { label: "QUALIFIED", range: "Score 30–49", desc: "Potential — nurture" },
              { label: "COLD", range: "Score < 30", desc: "Low priority for now" },
            ].map(({ label, range, desc }) => (
              <div key={label} className={`border rounded-lg p-3 ${PRIORITY_COLOR[label] ?? ""}`}>
                <p className="font-bold">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">{range}</p>
                <p className="text-xs opacity-60 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring explanation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">How Scores Are Calculated</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400">
            <div>
              <p className="text-zinc-300 font-medium mb-1">Overall Score (sales priority)</p>
              <ul className="space-y-0.5">
                <li>Opportunity  40% — pain / need for our services</li>
                <li>Contact      30% — phone + email reachability</li>
                <li>Trust        20% — reviews, rating, address</li>
                <li>Social       10% — Facebook, Instagram, LinkedIn</li>
              </ul>
            </div>
            <div>
              <p className="text-zinc-300 font-medium mb-1">Project Value Estimation</p>
              <ul className="space-y-0.5">
                <li>Rules-based by business category</li>
                <li>Adjusted for business size (review count)</li>
                <li>Ranges: £500–£7,000 depending on sector</li>
                <li>Displayed as midpoint of range</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
