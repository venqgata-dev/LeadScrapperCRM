"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCampaigns,
  fetchCampaignStats,
  createCampaign,
  checkDuplicate,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  deleteCampaign,
  type Campaign,
  type CampaignCreate,
  type CampaignStats,
} from "@/lib/api";
import {
  Play, Pause, Square, Eye, Trash2, Plus, X, RefreshCw,
  TrendingUp, BarChart2, AlertTriangle, CheckCircle2, Clock,
  Zap, DollarSign, MapPin, Tag, Globe, Settings2,
} from "lucide-react";

// ─── Shared constants ─────────────────────────────────────────────────────────

import {
  UK_CATEGORY_GROUPS, BULGARIA_CATEGORY_GROUPS as BG_CATEGORY_GROUPS,
  MAJOR_CITIES, SMALL_TOWNS, type CategoryGroup,
} from "@/lib/category-data";

const COUNTRIES = ["United Kingdom", "Bulgaria"] as const;

const PROVIDERS = [
  { id: "google_maps", label: "Google Maps API", note: "Best quality · requires key" },
  { id: "yell",         label: "Yell.com",         note: "Free · UK only" },
  { id: "thomson_local",label: "Thomson Local",     note: "Free · UK only" },
  { id: "freeindex",    label: "FreeIndex",         note: "Free · UK only" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function formatCost(cost: number): string {
  return cost === 0 ? "$0.00" : `$${cost.toFixed(4)}`;
}

function autoName(country: string, category: string, cities: string[]): string {
  const cityPart = cities.length === 1 ? cities[0] : `${cities.length} cities`;
  return `${category} · ${cityPart} · ${country === "United Kingdom" ? "UK" : "BG"}`;
}

const STATUS_COLORS: Record<string, string> = {
  Draft:     "bg-slate-100 text-slate-600",
  Running:   "bg-blue-100 text-blue-700",
  Paused:    "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Failed:    "bg-red-100 text-red-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const STATUS_DOT: Record<string, string> = {
  Draft:     "bg-slate-400",
  Running:   "bg-blue-500 animate-pulse",
  Paused:    "bg-amber-500",
  Completed: "bg-green-500",
  Failed:    "bg-red-500",
  Cancelled: "bg-slate-400",
};

const PROVIDER_LABELS: Record<string, string> = {
  google_maps:   "Google Maps",
  yell:          "Yell",
  thomson_local: "Thomson Local",
  freeindex:     "FreeIndex",
  outscraper:    "Outscraper",
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ campaign }: { campaign: Campaign }) {
  const p = campaign.progress_data;
  const done  = p?.cities_done  ?? 0;
  const total = p?.cities_total ?? campaign.cities.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const elapsed = campaign.started_at
    ? Math.floor((Date.now() - new Date(campaign.started_at).getTime()) / 1000)
    : 0;
  const rate = elapsed > 0 && done > 0 ? done / elapsed : null;
  const remaining = rate && total > done ? Math.round((total - done) / rate) : null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{p?.current_city ? `Searching: ${p.current_city}` : "Starting…"}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-3 text-xs text-slate-400">
        <span>{done}/{total} cities</span>
        <span>·</span>
        <span>{(p?.results_so_far ?? campaign.deduped_results).toLocaleString()} found</span>
        {elapsed > 0 && <><span>·</span><span>Elapsed: {formatDuration(elapsed)}</span></>}
        {remaining !== null && <><span>·</span><span>~{formatDuration(remaining)} left</span></>}
      </div>
    </div>
  );
}

// ─── Analytics mini-charts ─────────────────────────────────────────────────────

function BarChart({ data, label }: { data: { key: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      {data.slice(0, 6).map(d => (
        <div key={d.key} className="flex items-center gap-2">
          <span className="w-28 truncate text-xs text-slate-600 text-right">{d.key}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-sm transition-all"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-6 text-xs text-slate-500 text-right">{d.value}</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-xs text-slate-400 italic">No data yet</p>}
    </div>
  );
}

// ─── Create Campaign dialog ────────────────────────────────────────────────────

interface CreateDialogProps {
  onClose: () => void;
  onCreated: (c: Campaign) => void;
}

function CreateCampaignDialog({ onClose, onCreated }: CreateDialogProps) {
  const [country, setCountry]           = useState<string>("United Kingdom");
  const [provider, setProvider]         = useState("google_maps");
  const [groupKey, setGroupKey]         = useState("home_services");
  const [category, setCategory]         = useState("Plumber");
  const [searchType, setSearchType]     = useState<"major"|"small"|"both"|"custom">("major");
  const [customCities, setCustomCities] = useState<Set<string>>(new Set());
  const [expandKw, setExpandKw]         = useState(true);
  const [expandNbr, setExpandNbr]       = useState(false);
  const [autoImport, setAutoImport]     = useState(false);
  const [name, setName]                 = useState("");
  const [nameEdited, setNameEdited]     = useState(false);

  const [warning, setWarning]           = useState<string | null>(null);
  const [warnDismissed, setWarnDismissed] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [checking, setChecking]         = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const groups = country === "United Kingdom" ? UK_CATEGORY_GROUPS : BG_CATEGORY_GROUPS;
  const currentGroup = groups.find(g => g.key === groupKey) ?? groups[0];

  const resolvedCities: string[] = (() => {
    if (searchType === "major")  return MAJOR_CITIES[country] ?? [];
    if (searchType === "small")  return SMALL_TOWNS[country] ?? [];
    if (searchType === "both")   return [...(MAJOR_CITIES[country] ?? []), ...(SMALL_TOWNS[country] ?? [])];
    return Array.from(customCities);
  })();

  // Auto-update name when key fields change (unless manually edited)
  useEffect(() => {
    if (!nameEdited) {
      setName(autoName(country, category, resolvedCities));
    }
  }, [country, category, resolvedCities, nameEdited]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset category when country/group changes
  useEffect(() => {
    const g = (country === "United Kingdom" ? UK_CATEGORY_GROUPS : BG_CATEGORY_GROUPS).find(g => g.key === groupKey);
    if (g) setCategory(g.categories[0] ?? "");
    else {
      const first = (country === "United Kingdom" ? UK_CATEGORY_GROUPS : BG_CATEGORY_GROUPS)[0];
      if (first) { setGroupKey(first.key); setCategory(first.categories[0] ?? ""); }
    }
  }, [country, groupKey]);

  const handleSubmit = async (force = false) => {
    if (!name.trim() || resolvedCities.length === 0) {
      setError("Campaign name and at least one city are required.");
      return;
    }
    const payload: CampaignCreate = {
      name: name.trim(),
      country,
      provider,
      category,
      category_group: currentGroup?.group ?? null,
      cities: resolvedCities,
      search_type: searchType,
      expand_keywords: expandKw,
      expand_neighbors: expandNbr,
      auto_import: autoImport,
    };

    if (!force && !warnDismissed) {
      setChecking(true);
      try {
        const dup = await checkDuplicate(payload);
        if (dup.is_duplicate && dup.warning_message) {
          setWarning(dup.warning_message);
          setChecking(false);
          return;
        }
      } catch { /* ignore */ }
      setChecking(false);
    }

    setSaving(true);
    setError(null);
    try {
      const campaign = await createCampaign(payload);
      onCreated(campaign);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  const allMajor = MAJOR_CITIES[country] ?? [];
  const allSmall = SMALL_TOWNS[country] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">New Search Campaign</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Duplicate warning */}
          {warning && !warnDismissed && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-800">Similar campaign already ran</p>
                <p className="text-sm text-amber-700">{warning}</p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setWarnDismissed(true); handleSubmit(true); }}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Run anyway
                  </button>
                  <button
                    onClick={() => setWarning(null)}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          {/* Row 1: Country + Provider */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Country</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Provider</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.label} — {p.note}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Category group + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Category Group</label>
              <select
                value={groupKey}
                onChange={e => setGroupKey(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {groups.map(g => <option key={g.key} value={g.key}>{g.group}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {(currentGroup?.categories ?? []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Search type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Cities to search</label>
            <div className="grid grid-cols-4 gap-2">
              {([["major","Major Cities"],["small","Small Towns"],["both","Both"],["custom","Custom"]] as const).map(([v, lbl]) => (
                <button
                  key={v}
                  onClick={() => setSearchType(v)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    searchType === v
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {searchType !== "custom" && (
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                <span className="font-medium">{resolvedCities.length} cities: </span>
                {resolvedCities.join(", ")}
              </div>
            )}

            {searchType === "custom" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Select cities:</p>
                <div className="space-y-2">
                  {allMajor.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-1">Major Cities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allMajor.map(city => (
                          <button
                            key={city}
                            onClick={() => {
                              const next = new Set(customCities);
                              next.has(city) ? next.delete(city) : next.add(city);
                              setCustomCities(next);
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              customCities.has(city)
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {allSmall.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-1">Small Towns</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allSmall.map(city => (
                          <button
                            key={city}
                            onClick={() => {
                              const next = new Set(customCities);
                              next.has(city) ? next.delete(city) : next.add(city);
                              setCustomCities(next);
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              customCities.has(city)
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 gap-2">
            {([
              [expandKw,     setExpandKw,     "Expand Keywords",              "Search ~5-10 related keyword variations"],
              [expandNbr,    setExpandNbr,    "Expand Neighbouring Towns",    "Include towns near each selected city"],
              [autoImport,   setAutoImport,   "Import Opportunities Automatically", "Auto-import NO_WEBSITE + FACEBOOK + FREE_BUILDER leads when complete"],
            ] as [boolean, (v: boolean) => void, string, string][]).map(([val, setter, label, hint]) => (
              <label key={label} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-slate-200 transition-colors">
                <div className="mt-0.5">
                  <div
                    onClick={() => setter(!val)}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer ${val ? "bg-blue-600" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : ""}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{hint}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Campaign name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameEdited(true); }}
              onFocus={() => setNameEdited(true)}
              placeholder="e.g. Plumber · London · UK"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={saving || checking || resolvedCities.length === 0}
            onClick={() => handleSubmit(false)}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Creating…" : checking ? "Checking…" : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`rounded-xl p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns]         = useState<Campaign[]>([]);
  const [stats, setStats]                 = useState<CampaignStats | null>(null);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [tab, setTab]                     = useState<"campaigns"|"analytics">("campaigns");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([fetchCampaigns(), fetchCampaignStats()]);
      setCampaigns(c);
      setStats(s);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while any campaign is Running
  useEffect(() => {
    const hasRunning = campaigns.some(c => c.status === "Running");
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(() => load(), 3000);
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [campaigns, load]);

  const act = async (fn: () => Promise<Campaign>, id: number) => {
    setActionLoading(id);
    try {
      const updated = await fn();
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      await load();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      await deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      setStats(prev => prev ? { ...prev, total: prev.total - 1 } : prev);
    } catch { /* ignore */ }
    finally { setActionLoading(null); setDeleteConfirm(null); }
  };

  // Analytics data
  const topCategories = (() => {
    const counts: Record<string, number> = {};
    for (const c of campaigns) counts[c.category] = (counts[c.category] ?? 0) + c.opportunities;
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([key,value])=>({ key, value }));
  })();

  const topCities = (() => {
    const counts: Record<string, number> = {};
    for (const c of campaigns) for (const city of c.cities) counts[city] = (counts[city] ?? 0) + 1;
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([key,value])=>({ key, value }));
  })();

  const campaignsByMonth = (() => {
    const counts: Record<string, number> = {};
    for (const c of campaigns) {
      const m = new Date(c.created_at).toLocaleDateString("en-GB", { month:"short", year:"numeric" });
      counts[m] = (counts[m] ?? 0) + 1;
    }
    return Object.entries(counts).slice(-6).map(([key,value])=>({ key, value }));
  })();

  const oppRate = (() => {
    const completed = campaigns.filter(c => c.status === "Completed" && c.deduped_results > 0);
    return completed.map(c => ({
      key: c.name.slice(0, 20),
      value: Math.round((c.opportunities / c.deduped_results) * 100),
    })).sort((a,b)=>b.value-a.value);
  })();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Search Campaigns</h1>
          <p className="mt-0.5 text-sm text-slate-500">Run automated lead generation campaigns across cities and categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          <StatCard label="Campaigns"         value={stats.total}                              icon={BarChart2}   color="bg-slate-100 text-slate-600" />
          <StatCard label="Running"           value={stats.running}                            icon={Play}        color="bg-blue-100 text-blue-600" />
          <StatCard label="Completed"         value={stats.completed}                          icon={CheckCircle2} color="bg-green-100 text-green-600" />
          <StatCard label="Businesses Found"  value={stats.businesses_found.toLocaleString()}  icon={Globe}       color="bg-indigo-100 text-indigo-600" />
          <StatCard label="Imported"          value={stats.imported.toLocaleString()}          icon={TrendingUp}  color="bg-emerald-100 text-emerald-600" />
          <StatCard label="Opportunities"     value={stats.opportunities.toLocaleString()}     icon={Zap}         color="bg-amber-100 text-amber-600" />
          <StatCard label="Est. API Cost"     value={formatCost(stats.estimated_cost)}         icon={DollarSign}  color="bg-rose-100 text-rose-600" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["campaigns","analytics"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "campaigns" && (
        <>
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <BarChart2 className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">No campaigns yet</h3>
              <p className="mt-1 text-sm text-slate-500">Create your first campaign to start automating lead generation.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> New Campaign
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Status","Campaign","Country","Provider","Category","Cities","Businesses","Opps","Imported","API Req.","Est. Cost","Duration","Started","Actions"].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {campaigns.map(c => {
                      const isLoading = actionLoading === c.id;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[c.status]}`} />
                              {c.status}
                            </span>
                          </td>

                          {/* Name + progress */}
                          <td className="px-4 py-3 min-w-[200px]">
                            <p className="font-medium text-slate-900 truncate max-w-[180px]" title={c.name}>{c.name}</p>
                            {c.status === "Running" && <ProgressBar campaign={c} />}
                            {c.status === "Failed" && c.progress_data?.error && (
                              <p className="mt-1 text-xs text-red-500 truncate max-w-[180px]">{c.progress_data.error}</p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3 text-slate-400" />
                              {c.country === "United Kingdom" ? "UK" : "BG"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {PROVIDER_LABELS[c.provider] ?? c.provider}
                          </td>

                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Tag className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]" title={c.category}>{c.category}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-slate-600" title={c.cities.join(", ")}>
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              {c.cities.length === 1 ? c.cities[0] : `${c.cities.length} cities`}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-700">
                            {c.deduped_results > 0 ? c.deduped_results.toLocaleString() : "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-amber-600">
                            {c.opportunities > 0 ? c.opportunities.toLocaleString() : "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-emerald-600">
                            {c.imported > 0 ? c.imported.toLocaleString() : "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-center text-slate-500">
                            {c.api_requests > 0 ? c.api_requests.toLocaleString() : "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500">
                            {c.estimated_cost > 0 ? formatCost(c.estimated_cost) : "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {formatDuration(c.duration_seconds)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                            {formatDate(c.started_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            {deleteConfirm === c.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  disabled={isLoading}
                                  className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                >
                                  {isLoading ? "…" : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="rounded-lg border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                {/* Start */}
                                {["Draft","Paused","Failed","Cancelled"].includes(c.status) && (
                                  <button
                                    title="Start"
                                    disabled={isLoading}
                                    onClick={() => act(() => startCampaign(c.id), c.id)}
                                    className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-40"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {/* Pause */}
                                {c.status === "Running" && (
                                  <button
                                    title="Pause"
                                    disabled={isLoading}
                                    onClick={() => act(() => pauseCampaign(c.id), c.id)}
                                    className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {/* Cancel */}
                                {["Running","Paused"].includes(c.status) && (
                                  <button
                                    title="Cancel"
                                    disabled={isLoading}
                                    onClick={() => act(() => cancelCampaign(c.id), c.id)}
                                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
                                  >
                                    <Square className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {/* View leads */}
                                <a
                                  href={`/leads?campaign=${c.id}`}
                                  title="View leads"
                                  className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </a>
                                {/* Delete */}
                                {c.status !== "Running" && (
                                  <button
                                    title="Delete"
                                    disabled={isLoading}
                                    onClick={() => setDeleteConfirm(c.id)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "analytics" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <BarChart data={campaignsByMonth} label="Campaigns per Month" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <BarChart data={oppRate} label="Opportunity Rate (%)" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <BarChart data={topCategories} label="Top Categories (by Opps)" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <BarChart data={topCities} label="Top Cities (by Searches)" />
          </div>

          {/* API usage summary */}
          <div className="sm:col-span-2 lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5" />
              Google API Usage Summary
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Total Requests", campaigns.reduce((s,c)=>s+c.api_requests,0).toLocaleString()],
                ["Total Cost",     formatCost(campaigns.reduce((s,c)=>s+c.estimated_cost,0))],
                ["Avg / Campaign", campaigns.length > 0
                  ? `${Math.round(campaigns.reduce((s,c)=>s+c.api_requests,0)/campaigns.length)} req`
                  : "—"],
                ["Cost / 1000 biz", campaigns.reduce((s,c)=>s+c.deduped_results,0) > 0
                  ? formatCost(campaigns.reduce((s,c)=>s+c.estimated_cost,0) / campaigns.reduce((s,c)=>s+c.deduped_results,0) * 1000)
                  : "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Rate: $0.032 per Google Maps Places request (Basic Text Search)</p>
          </div>

          {/* Campaign history table */}
          {campaigns.filter(c=>c.status==="Completed").length > 0 && (
            <div className="sm:col-span-2 lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Campaign History</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      {["Campaign","Date","Duration","Found","Dupes Removed","Opps","Imported","API Req","Cost"].map(h=>(
                        <th key={h} className="pb-2 pr-3 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {campaigns.filter(c=>c.status==="Completed").slice(0,20).map(c=>(
                      <tr key={c.id} className="text-slate-600">
                        <td className="py-2 pr-3 max-w-[120px] truncate font-medium text-slate-800" title={c.name}>{c.name}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(c.completed_at)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDuration(c.duration_seconds)}</td>
                        <td className="py-2 pr-3">{c.deduped_results.toLocaleString()}</td>
                        <td className="py-2 pr-3">{(c.raw_results - c.deduped_results).toLocaleString()}</td>
                        <td className="py-2 pr-3 text-amber-600 font-medium">{c.opportunities.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-emerald-600 font-medium">{c.imported.toLocaleString()}</td>
                        <td className="py-2 pr-3">{c.api_requests.toLocaleString()}</td>
                        <td className="py-2 pr-3">{formatCost(c.estimated_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateCampaignDialog
          onClose={() => setShowCreate(false)}
          onCreated={campaign => {
            setCampaigns(prev => [campaign, ...prev]);
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
