"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, FileText, CheckCircle2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function downloadUrl(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.click();
}

async function downloadJson(path: string, filename: string) {
  const res = await fetch(`${API}${path}`);
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadCsv(path: string, filename: string) {
  const res = await fetch(`${API}${path}`);
  const rows: Record<string, unknown>[] = await res.json();
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Fmt { label: string; icon: React.ElementType; color: string; action: () => void | Promise<void> }

interface ExportOption { id: string; title: string; description: string; formats: Fmt[] }

export default function ExportCenterPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function run(id: string, action: () => void | Promise<void>) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await action();
      setDone(d => ({ ...d, [id]: true }));
      setTimeout(() => setDone(d => ({ ...d, [id]: false })), 3000);
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  }

  const exports: ExportOption[] = [
    {
      id: "businesses",
      title: "Businesses / Leads",
      description: "All scraped businesses with contact info, website status, lead score, and CRM status.",
      formats: [
        { label: "Excel (.xlsx)", icon: FileSpreadsheet, color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100", action: () => downloadUrl(`${API}/businesses/export/xlsx`) },
        { label: "CSV", icon: FileText, color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100", action: () => downloadCsv("/businesses?limit=10000", "businesses.csv") },
        { label: "JSON", icon: FileJson, color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100", action: () => downloadJson("/businesses?limit=10000", "businesses.json") },
      ],
    },
    {
      id: "deals",
      title: "Deals",
      description: "All deals with status, value, probability, and linked business.",
      formats: [
        { label: "CSV", icon: FileText, color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100", action: () => downloadCsv("/deals", "deals.csv") },
        { label: "JSON", icon: FileJson, color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100", action: () => downloadJson("/deals", "deals.json") },
      ],
    },
    {
      id: "projects",
      title: "Website Projects",
      description: "All website projects with team, financials, stage, and completion.",
      formats: [
        { label: "CSV", icon: FileText, color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100", action: () => downloadCsv("/projects", "projects.csv") },
        { label: "JSON", icon: FileJson, color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100", action: () => downloadJson("/projects", "projects.json") },
      ],
    },
    {
      id: "campaigns",
      title: "Campaigns",
      description: "Lead finder campaigns with search parameters and result counts.",
      formats: [
        { label: "JSON", icon: FileJson, color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100", action: () => downloadJson("/campaigns", "campaigns.json") },
      ],
    },
    {
      id: "activities",
      title: "Activities",
      description: "All CRM activity events — calls, status changes, wins, losses.",
      formats: [
        { label: "JSON", icon: FileJson, color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100", action: () => downloadJson("/activities", "activities.json") },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Export Center</h1>
        <p className="mt-0.5 text-sm text-slate-500">Download your data in Excel, CSV, or JSON format</p>
      </div>

      <div className="space-y-4">
        {exports.map(exp => (
          <div key={exp.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{exp.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{exp.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {exp.formats.map(fmt => {
                  const key = `${exp.id}-${fmt.label}`;
                  const Icon = done[key] ? CheckCircle2 : fmt.icon;
                  return (
                    <button
                      key={fmt.label}
                      disabled={busy[key]}
                      onClick={() => run(key, fmt.action)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        done[key] ? "border-green-200 bg-green-50 text-green-700" : fmt.color
                      }`}
                    >
                      {busy[key] ? <Download className="h-3.5 w-3.5 animate-bounce" /> : <Icon className="h-3.5 w-3.5" />}
                      {done[key] ? "Downloaded!" : fmt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400">
        Exports include all records. Use filters on the leads/deals pages to narrow first if needed.
      </p>
    </div>
  );
}
