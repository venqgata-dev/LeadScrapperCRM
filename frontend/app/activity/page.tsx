"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon, Building2, Zap, Phone, Mail, FileText,
  RefreshCw, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { fetchActivities, type Activity } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iconForType(event_type: string) {
  if (event_type.includes("CALL"))       return <Phone className="h-3.5 w-3.5" />;
  if (event_type.includes("EMAIL"))      return <Mail className="h-3.5 w-3.5" />;
  if (event_type.includes("NOTE"))       return <FileText className="h-3.5 w-3.5" />;
  if (event_type.includes("ENRICHED"))   return <RefreshCw className="h-3.5 w-3.5" />;
  if (event_type.includes("WON"))        return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (event_type.includes("PROPOSAL"))   return <FileText className="h-3.5 w-3.5" />;
  if (event_type.includes("AI") || event_type.includes("SALES_INSIGHT")) return <Zap className="h-3.5 w-3.5" />;
  return <ActivityIcon className="h-3.5 w-3.5" />;
}

function colorForType(event_type: string) {
  if (event_type.includes("WON"))      return "bg-green-100 text-green-600";
  if (event_type.includes("CALL"))     return "bg-blue-100 text-blue-600";
  if (event_type.includes("EMAIL"))    return "bg-violet-100 text-violet-600";
  if (event_type.includes("PROPOSAL")) return "bg-amber-100 text-amber-600";
  if (event_type.includes("ENRICHED")) return "bg-cyan-100 text-cyan-600";
  if (event_type.includes("AI") || event_type.includes("SALES_INSIGHT")) return "bg-purple-100 text-purple-600";
  return "bg-slate-100 text-slate-500";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByDate(activities: Activity[]): Record<string, Activity[]> {
  return activities.reduce<Record<string, Activity[]>>((acc, a) => {
    const key = new Date(a.created_at).toLocaleDateString("en-GB", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]       = useState(true);
  const [limit, setLimit]           = useState(100);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchActivities({ limit });
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = groupByDate(activities);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Timeline</h1>
          <p className="mt-0.5 text-sm text-slate-500">Every action across your CRM, in order</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && activities.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-48 rounded bg-slate-200" />
                <div className="h-3 w-80 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-400">
          <ActivityIcon className="mb-3 h-12 w-12 opacity-30" />
          <p className="text-base font-medium">No activity recorded yet</p>
          <p className="text-sm">Actions you take will appear here</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              {/* Day header */}
              <div className="mb-4 flex items-center gap-3">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{date}</p>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Events */}
              <div className="relative border-l-2 border-slate-200 ml-3.5 space-y-1">
                {items.map(a => (
                  <div key={a.id} className="relative flex gap-4 pb-5 pl-6">
                    {/* Dot */}
                    <span className={`absolute -left-[11px] top-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${colorForType(a.event_type)}`}>
                      {iconForType(a.event_type)}
                    </span>

                    {/* Content */}
                    <div className="flex-1 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-tight">{a.title}</p>
                          {a.description && (
                            <p className="mt-0.5 text-xs text-slate-500">{a.description}</p>
                          )}
                          {a.business_name && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              {a.business_id ? (
                                <Link href={`/leads/${a.business_id}`} className="text-xs text-blue-600 hover:underline">
                                  {a.business_name}
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">{a.business_name}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
                          {fmtDate(a.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {activities.length >= limit && (
            <div className="flex justify-center">
              <button
                onClick={() => setLimit(l => l + 100)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
