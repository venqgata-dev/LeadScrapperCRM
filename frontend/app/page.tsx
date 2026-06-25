"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchStats,
  searchLeads,
  importBatch,
  previewCsv,
  type DashboardStats,
  type SearchResultLead,
  type SearchAnalytics,
  type ImportResult,
  type WebsiteStatus,
} from "@/lib/api";
import { WebsiteStatusBadge } from "@/components/WebsiteStatusBadge";
import {
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  CheckSquare,
  Square,
  ExternalLink,
  Star,
  Upload,
  Download,
  TrendingUp,
  MapPin,
  Zap,
  BarChart2,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = ["United Kingdom", "Bulgaria"] as const;

const MAJOR_CITIES: Record<string, string[]> = {
  "United Kingdom": [
    "London", "Manchester", "Birmingham", "Leeds", "Liverpool",
    "Bristol", "Sheffield", "Glasgow", "Edinburgh", "Cardiff",
  ],
  Bulgaria: [
    "Sofia", "Varna", "Plovdiv", "Burgas", "Ruse",
    "Stara Zagora", "Pleven", "Sliven",
  ],
};

const SMALL_TOWNS: Record<string, string[]> = {
  "United Kingdom": [
    "Rochdale", "Bolton", "Oldham", "Wigan", "Stockport",
    "Slough", "Reading", "Luton",
  ],
  Bulgaria: [
    "Перник", "Дупница", "Самоков", "Казанлък",
    "Търговище", "Габрово", "Ловеч", "Видин",
  ],
};

// Mirrors backend neighbors.py — used only for UI preview text
const NEIGHBOR_CITIES: Record<string, string[]> = {
  Glasgow:     ["Paisley", "Clydebank", "East Kilbride", "Renfrew", "Bearsden"],
  Edinburgh:   ["Livingston", "Kirkcaldy", "Dunfermline", "Musselburgh", "Dalkeith"],
  Manchester:  ["Salford", "Stockport", "Oldham", "Bolton", "Rochdale", "Wigan"],
  Liverpool:   ["Birkenhead", "Runcorn", "Warrington", "St Helens", "Bootle"],
  Leeds:       ["Bradford", "Wakefield", "Huddersfield", "Halifax", "Batley"],
  Sheffield:   ["Rotherham", "Barnsley", "Doncaster", "Chesterfield"],
  Birmingham:  ["Solihull", "Wolverhampton", "Coventry", "Walsall", "West Bromwich"],
  Nottingham:  ["Derby", "Leicester", "Loughborough", "Ilkeston"],
  London:      ["Croydon", "Bromley", "Enfield", "Harrow", "Romford"],
  Reading:     ["Slough", "Maidenhead", "Wokingham", "Bracknell"],
  Bristol:     ["Bath", "Weston-super-Mare", "Gloucester", "Cheltenham"],
  Cardiff:     ["Newport", "Barry", "Bridgend", "Pontypridd"],
  Newcastle:   ["Gateshead", "Sunderland", "Durham", "Middlesbrough"],
  Southampton: ["Portsmouth", "Fareham", "Eastleigh", "Totton"],
  Brighton:    ["Hove", "Worthing", "Eastbourne", "Lewes"],
  // Bulgaria
  Sofia:       ["Pernik", "Dupnitsa", "Samokov", "Botevgrad", "Bozhurishte"],
  Varna:       ["Devnya", "Beloslav", "Aksakovo", "Provadiya"],
  Plovdiv:     ["Asenovgrad", "Rakovski", "Stamboliyski", "Karlovo"],
  Burgas:      ["Nesebar", "Aytos", "Pomorie", "Sredets"],
};

const UK_CATEGORIES = [
  "Window Cleaner", "Gardener", "Handyman", "Carpet Cleaner",
  "Mobile Mechanic", "Dog Groomer",
  "Plumber", "Electrician", "Roofer", "Builder", "Painter & Decorator",
  "Locksmith", "Plasterer", "Carpenter", "Landscaper",
  "Restaurant", "Cafe", "Hair Salon", "Beauty Salon", "Barber",
  "Auto Repair", "Mechanic", "Car Wash",
  "Dentist", "Accountant", "Solicitor", "Estate Agent",
  "Cleaning Services", "Gym", "Physio",
] as const;

const BULGARIA_CATEGORIES = [
  "Фризьор", "Козметичен салон", "Автосервиз", "Ключар",
  "Озеленяване", "Почистване", "Майстор", "ВиК услуги",
  "Plumber", "Electrician", "Builder", "Restaurant", "Hotel",
  "Dentist", "Accountant",
] as const;

const STATUS_ORDER: Record<WebsiteStatus, number> = {
  NO_WEBSITE: 0, FACEBOOK_ONLY: 1, FREE_BUILDER: 2, BROKEN_WEBSITE: 3, HAS_WEBSITE: 4,
};

const OPPORTUNITY_STATUSES: WebsiteStatus[] = ["NO_WEBSITE", "FACEBOOK_ONLY", "FREE_BUILDER"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportToCsv(leads: SearchResultLead[], filename = "leads.csv") {
  const cols = [
    "name", "phone", "email", "website", "website_status",
    "city", "country", "category", "rating", "review_count",
    "lead_score", "opportunity_reason", "google_maps_url",
  ] as const;

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}`
      : s;
  };

  const rows = [
    cols.join(","),
    ...leads.map((l) => cols.map((c) => escape(l[c as keyof SearchResultLead])).join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function deduplicateLeads(leads: SearchResultLead[]): SearchResultLead[] {
  const seenNames = new Set<string>();
  const seenPhones = new Set<string>();
  const seenSites = new Set<string>();
  const out: SearchResultLead[] = [];

  for (const lead of leads) {
    const nameKey = lead.name.toLowerCase().trim();
    const phoneKey = lead.phone?.replace(/\D/g, "") ?? "";
    const siteKey = (lead.website ?? "")
      .toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

    if (seenNames.has(nameKey)) continue;
    if (phoneKey && seenPhones.has(phoneKey)) continue;
    if (siteKey && seenSites.has(siteKey)) continue;

    seenNames.add(nameKey);
    if (phoneKey) seenPhones.add(phoneKey);
    if (siteKey) seenSites.add(siteKey);
    out.push(lead);
  }
  return out;
}

interface LeaderboardEntry {
  label: string;
  total: number;
  opportunities: number;
  rate: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadFinderPage() {
  // form
  const [country, setCountry] = useState<string>("United Kingdom");
  const [city, setCity] = useState("");
  const [searchMode, setSearchMode] = useState<"city" | "small_towns" | "both">("city");
  const [selectedTowns, setSelectedTowns] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("Window Cleaner");
  const [customCategory, setCustomCategory] = useState("");
  const [source, setSource] = useState<"google_maps" | "yell" | "thomson_local" | "cylex" | "freeindex" | "csv">("google_maps");
  const [radiusKm, setRadiusKm] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [expandNeighbors, setExpandNeighbors] = useState(false);
  const [expandKeywords, setExpandKeywords] = useState(true);

  // results
  const [results, setResults] = useState<SearchResultLead[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showHasWebsite, setShowHasWebsite] = useState(false);

  // session leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // CRM stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  useEffect(() => {
    fetchStats().then(setStats).catch(() => null);
  }, []);

  const categories = country === "Bulgaria" ? BULGARIA_CATEGORIES : UK_CATEGORIES;
  const effectiveCategory = category === "Custom" ? customCategory : category;
  const cityList = MAJOR_CITIES[country] ?? [];
  const smallTownList = SMALL_TOWNS[country] ?? [];
  const neighborPreview = city ? (NEIGHBOR_CITIES[city] ?? []) : [];

  function handleCountryChange(c: string) {
    setCountry(c);
    if (!MAJOR_CITIES[c]?.includes(city)) setCity("");
    const ukOnlySources = ["yell", "thomson_local", "cylex", "freeindex"];
    if (c === "Bulgaria" && ukOnlySources.includes(source)) setSource("google_maps");
    const cats = c === "Bulgaria" ? BULGARIA_CATEGORIES : UK_CATEGORIES;
    setCategory(cats[0]);
    setSelectedTowns(new Set());
    setExpandNeighbors(false);
  }

  function toggleTown(town: string) {
    setSelectedTowns((prev) => {
      const next = new Set(prev);
      next.has(town) ? next.delete(town) : next.add(town);
      return next;
    });
  }

  function selectAllTowns() { setSelectedTowns(new Set(smallTownList)); }
  function deselectAllTowns() { setSelectedTowns(new Set()); }

  function getCitiesToSearch(): string[] {
    const cities: string[] = [];
    if (searchMode !== "small_towns" && city.trim()) cities.push(city.trim());
    if (searchMode !== "city") {
      for (const t of selectedTowns) cities.push(t);
    }
    return [...new Set(cities)];
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (source === "csv" && !csvFile) return;
    if (source !== "csv") {
      const cities = getCitiesToSearch();
      if (cities.length === 0 || !effectiveCategory.trim()) return;
    }

    if (source === "google_maps" && radiusKm > 50) {
      setSearchError("Google Maps supports a maximum search radius of 50 km.");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResults([]);
    setAnalytics(null);
    setSelected(new Set());
    setImportResult(null);
    setImportError(null);
    setHasSearched(true);

    try {
      let data: SearchResultLead[];
      let mergedAnalytics: SearchAnalytics | null = null;

      if (source === "csv") {
        data = await previewCsv(csvFile!);
      } else {
        const cities = getCitiesToSearch();
        const isSingleCity = cities.length === 1;

        // Run all city searches in parallel
        const cityResponses = await Promise.all(
          cities.map((c) =>
            searchLeads({
              country,
              city: c,
              category: effectiveCategory.trim(),
              provider: source,
              radius_km: source === "google_maps" ? radiusKm : 0,
              // Only pass expand_neighbors for single-city mode; multi-city already explicit
              expand_neighbors: isSingleCity ? expandNeighbors : false,
              expand_keywords: expandKeywords,
            })
          )
        );

        // Merge analytics across city responses
        const allLeads = cityResponses.flatMap((r) => r.leads);
        data = deduplicateLeads(allLeads);

        // Aggregate analytics
        const rawTotal = cityResponses.reduce((s, r) => s + r.analytics.raw_count, 0);
        const allCities = [...new Set(cityResponses.flatMap((r) => r.analytics.cities_searched))];
        const allKeywords = cityResponses[0]?.analytics.keywords_used ?? [];
        const noWebsite = data.filter((l) => l.website_status === "NO_WEBSITE").length;
        const facebookOnly = data.filter((l) => l.website_status === "FACEBOOK_ONLY").length;
        const freeBuilder = data.filter((l) => l.website_status === "FREE_BUILDER").length;

        mergedAnalytics = {
          raw_count: rawTotal,
          deduped_count: data.length,
          opportunities: noWebsite + facebookOnly + freeBuilder,
          no_website: noWebsite,
          facebook_only: facebookOnly,
          free_builder: freeBuilder,
          cities_searched: allCities,
          keywords_used: allKeywords,
        };
      }

      const sortedData = Array.isArray(data)
        ? [...data].sort((a, b) => {
            const statusDiff = STATUS_ORDER[a.website_status] - STATUS_ORDER[b.website_status];
            if (statusDiff !== 0) return statusDiff;
            if (b.review_count !== a.review_count) return b.review_count - a.review_count;
            return (b.rating ?? 0) - (a.rating ?? 0);
          })
        : [];
      setResults(sortedData);
      setAnalytics(mergedAnalytics);

      // Update session leaderboard
      const opps = data.filter((r) => OPPORTUNITY_STATUSES.includes(r.website_status)).length;
      const rate = data.length > 0 ? Math.round((opps / data.length) * 100) : 0;
      if (data.length > 0 && source !== "csv") {
        const cities = getCitiesToSearch();
        const label = `${cities.join(" + ")} / ${effectiveCategory}`;
        setLeaderboard((prev) => {
          const next = [
            ...prev.filter((e) => e.label !== label),
            { label, total: data.length, opportunities: opps, rate },
          ]
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 6);
          return next;
        });
      }
    } catch (err) {
      setSearchError(String(err));
    } finally {
      setSearching(false);
    }
  }

  function toggleRow(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(displayResults.map((_, i) => i))); }
  function deselectAll() { setSelected(new Set()); }

  async function handleImport(leadsToImport: SearchResultLead[]) {
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      setImportResult(await importBatch(leadsToImport));
    } catch (err) {
      setImportError(String(err));
    } finally {
      setImporting(false);
    }
  }

  const displayResults = showHasWebsite
    ? results
    : results.filter((r) => OPPORTUNITY_STATUSES.includes(r.website_status));

  const selectedLeads = displayResults.filter((_, i) => selected.has(i));
  const opportunityCount = results.filter((r) => OPPORTUNITY_STATUSES.includes(r.website_status)).length;
  const opportunityRate = results.length > 0 ? Math.round((opportunityCount / results.length) * 100) : 0;

  const showSmallTownPicker = source !== "csv" && searchMode !== "city";
  const showCityInput = source !== "csv" && searchMode !== "small_towns";
  const canSearch =
    source === "csv"
      ? !!csvFile && !searching
      : getCitiesToSearch().length > 0 && !!effectiveCategory.trim() && !searching;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Hero header ── */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Website Opportunity Finder</h1>
        <p className="mt-1 text-slate-500">
          Find businesses without a proper website — then pitch yours.
        </p>
      </div>

      {/* ── CRM stats strip ── */}
      {stats !== null && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Opportunities", value: stats.total_opportunities, color: "text-blue-700",   bg: "bg-blue-50 border-blue-100" },
            { label: "No Website",          value: stats.no_website,          color: "text-red-700",    bg: "bg-red-50 border-red-100" },
            { label: "Facebook Only",       value: stats.facebook_only,       color: "text-orange-700", bg: "bg-orange-50 border-orange-100" },
            { label: "Free Builder",        value: stats.free_builder,        color: "text-amber-700",  bg: "bg-amber-50 border-amber-100" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border ${bg} px-4 py-3`}>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className={`mt-0.5 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Session leaderboard ── */}
      {leaderboard.length > 0 && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-semibold text-slate-700">Top Opportunity Markets (this session)</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {leaderboard.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-700">{entry.label}</p>
                  <p className="text-xs text-slate-400">{entry.total} businesses · {entry.opportunities} opps</p>
                </div>
                <span className={`ml-3 flex-shrink-0 text-sm font-bold ${
                  entry.rate >= 30 ? "text-green-600" : entry.rate >= 15 ? "text-amber-600" : "text-slate-400"
                }`}>
                  {entry.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search form ── */}
      <form
        onSubmit={handleSearch}
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* Source */}
          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Source</label>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { value: "google_maps",   label: "Google Maps",    tag: "API key · UK + BG", icon: "🗺️" },
                  { value: "yell",          label: "Yell.com",       tag: "Free · UK only",    icon: "🇬🇧" },
                  { value: "thomson_local", label: "Thomson Local",  tag: "Free · UK only",    icon: "📋" },
                  { value: "freeindex",     label: "FreeIndex",      tag: "Free · UK only",    icon: "🔍" },
                  { value: "cylex",         label: "Cylex",          tag: "Blocked · UK only", icon: "🚫" },
                  { value: "csv",           label: "CSV Upload",     tag: "From file",          icon: "📄" },
                ] as const
              ).map((s) => {
                const ukOnly = ["yell", "thomson_local", "cylex", "freeindex"].includes(s.value);
                const disabled = ukOnly && country === "Bulgaria";
                const active   = source === s.value && !disabled;
                return (
                  <button
                    key={s.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setSource(s.value)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : disabled
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                    <span className={`text-xs ${active ? "text-blue-200" : "text-slate-400"}`}>{s.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CSV upload */}
          {source === "csv" ? (
            <div className="lg:col-span-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">CSV File</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-5 py-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                {csvFile ? (
                  <span className="text-sm font-medium text-slate-800">{csvFile.name}</span>
                ) : (
                  <span className="text-sm text-slate-400">
                    Click to choose a CSV file — must have a <code className="rounded bg-slate-100 px-1 text-xs">name</code> column
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Country */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Country</label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Search type */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Search Type</label>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      { value: "city",        label: "Major city",    desc: "Search one city" },
                      { value: "small_towns", label: "Small towns",   desc: "Higher opp. rate" },
                      { value: "both",        label: "Both",          desc: "Widest coverage" },
                    ] as const
                  ).map((m) => (
                    <label key={m.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="searchMode"
                        value={m.value}
                        checked={searchMode === m.value}
                        onChange={() => setSearchMode(m.value)}
                        className="accent-blue-600"
                      />
                      <span className="font-medium text-slate-700">{m.label}</span>
                      <span className="text-xs text-slate-400">{m.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* City input */}
              {showCityInput && (
                <div className={showSmallTownPicker ? "" : "lg:col-span-2"}>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Glasgow"
                    list="city-datalist"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="city-datalist">
                    {cityList.map((c) => <option key={c} value={c} />)}
                  </datalist>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cityList.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCity(c)}
                        className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                          city === c
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 text-slate-500 hover:border-slate-400"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {/* Neighbor expansion — only for single-city mode */}
                  {searchMode === "city" && city && (
                    <div className="mt-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={expandNeighbors}
                          onChange={(e) => setExpandNeighbors(e.target.checked)}
                          className="accent-blue-600"
                        />
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium text-slate-700">Search neighboring towns</span>
                      </label>
                      {expandNeighbors && neighborPreview.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500 pl-5">
                          Also searching: {neighborPreview.join(", ")}
                        </p>
                      )}
                      {expandNeighbors && neighborPreview.length === 0 && (
                        <p className="mt-1 text-xs text-slate-400 pl-5">
                          No neighbor data for this city — searching city only
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Small town picker */}
              {showSmallTownPicker && (
                <div className={showCityInput ? "" : "lg:col-span-2"}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Small Towns</label>
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={selectAllTowns} className="text-blue-600 hover:underline">All</button>
                      <button type="button" onClick={deselectAllTowns} className="text-slate-400 hover:underline">None</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {smallTownList.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTown(t)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          selectedTowns.has(t)
                            ? "bg-green-600 text-white"
                            : "border border-slate-200 text-slate-500 hover:border-green-400 hover:text-green-700"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {selectedTowns.size > 0 && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {selectedTowns.size} town{selectedTowns.size !== 1 ? "s" : ""} selected — searches run in parallel
                    </p>
                  )}
                </div>
              )}

              {/* Category */}
              <div className={source === "google_maps" ? "" : "lg:col-span-2"}>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Business Category</label>
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Custom">Custom…</option>
                  </select>
                  {category === "Custom" && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter category…"
                      required
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Keyword expansion toggle */}
                <div className="mt-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={expandKeywords}
                      onChange={(e) => setExpandKeywords(e.target.checked)}
                      className="accent-blue-600"
                    />
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium text-slate-700">Expand keywords</span>
                    <span className="text-xs text-slate-400">(5–10 related terms)</span>
                  </label>
                </div>
              </div>

              {/* Radius — Google Maps only */}
              {source === "google_maps" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Search Radius</label>
                  <select
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>City only</option>
                    <option value={5}>5 km radius</option>
                    <option value={10}>10 km radius</option>
                    <option value={25}>25 km radius</option>
                    <option value={50}>50 km radius</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-400">Max 50 km — Google Maps API limit</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Submit */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSearch}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? "Searching…" : "Find Leads"}
          </button>
          {searching && (
            <p className="text-sm text-slate-400">
              {source === "csv"
                ? "Classifying rows…"
                : searchMode !== "city" && selectedTowns.size > 1
                ? `Searching ${getCitiesToSearch().length} cities in parallel…`
                : expandNeighbors && neighborPreview.length > 0
                ? `Searching ${city} + ${neighborPreview.length} neighbors…`
                : "Scraping directory — this takes 10–30 s…"}
            </p>
          )}
        </div>
      </form>

      {/* ── Search error ── */}
      {searchError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{searchError}</p>
        </div>
      )}

      {/* ── Results section ── */}
      {hasSearched && !searching && !searchError && (
        <div>
          {/* ── Search analytics panel ── */}
          {analytics && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {(() => {
                const oppRate = analytics.deduped_count > 0
                  ? Math.round((analytics.opportunities / analytics.deduped_count) * 100)
                  : 0;
                return (
                  <>
                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                      <BarChart2 className="h-4 w-4 text-blue-600" />
                      <h2 className="text-sm font-semibold text-slate-700">Search Analytics</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${
                        oppRate >= 30 ? "bg-green-100 text-green-700" :
                        oppRate >= 15 ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {oppRate}% opportunity rate
                      </span>
                      {analytics.cities_searched.length > 1 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {analytics.cities_searched.length} towns searched
                        </span>
                      )}
                      {analytics.keywords_used.length > 1 && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {analytics.keywords_used.length} keywords
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {[
                        { label: "Raw scraped",    value: analytics.raw_count,    color: "text-slate-600",  bg: "bg-slate-50" },
                        { label: "After dedup",    value: analytics.deduped_count, color: "text-blue-700",  bg: "bg-blue-50" },
                        { label: "Opportunities",  value: analytics.opportunities, color: "text-green-700", bg: "bg-green-50" },
                        { label: "No Website",     value: analytics.no_website,    color: "text-red-700",   bg: "bg-red-50" },
                        { label: "Facebook Only",  value: analytics.facebook_only, color: "text-orange-700",bg: "bg-orange-50" },
                        { label: "Free Builder",   value: analytics.free_builder,  color: "text-amber-700", bg: "bg-amber-50" },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`rounded-xl ${bg} px-3 py-2.5 text-center`}>
                          <p className={`text-xl font-bold ${color}`}>{value}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              {analytics.cities_searched.length > 1 && (
                <p className="mt-2 text-xs text-slate-400">
                  Cities: {analytics.cities_searched.join(" · ")}
                </p>
              )}
              {analytics.keywords_used.length > 1 && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Keywords: {analytics.keywords_used.join(" · ")}
                </p>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-semibold text-slate-800">
                {displayResults.length === 0
                  ? (results.length > 0
                    ? "No opportunities found — all results have websites."
                    : "No results found.")
                  : `${displayResults.length} opportunit${displayResults.length === 1 ? "y" : "ies"}`}
              </p>

              {results.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-xs">
                  <span className="text-slate-500">{results.length} total</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-slate-700">{opportunityCount} opps</span>
                  <span className="text-slate-300">·</span>
                  <span className={`font-bold ${
                    opportunityRate >= 30 ? "text-green-600" : opportunityRate >= 15 ? "text-amber-600" : "text-slate-400"
                  }`}>{opportunityRate}%</span>
                </div>
              )}

              {displayResults.length > 0 && (
                <>
                  <span className="text-sm text-slate-400">
                    {selected.size > 0 ? `${selected.size} selected` : ""}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={selectAll} className="text-blue-600 hover:underline">Select all</button>
                    {selected.size > 0 && (
                      <button type="button" onClick={deselectAll} className="text-slate-400 hover:underline">Deselect all</button>
                    )}
                  </div>
                </>
              )}

              {results.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setShowHasWebsite((v) => !v); setSelected(new Set()); }}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    showHasWebsite
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {showHasWebsite ? "Hiding" : "Show"} businesses with websites
                  {!showHasWebsite && results.filter(r => r.website_status === "HAS_WEBSITE").length > 0 && (
                    <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-slate-600">
                      +{results.filter(r => r.website_status === "HAS_WEBSITE").length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {displayResults.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportToCsv(
                    selected.size > 0 ? selectedLeads : displayResults,
                    `opportunities-${Date.now()}.csv`
                  )}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export {selected.size > 0 ? `${selected.size}` : "All"} CSV
                </button>
                <button
                  type="button"
                  disabled={selected.size === 0 || importing}
                  onClick={() => handleImport(selectedLeads)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  {importing && selected.size > 0 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Import Selected ({selected.size})
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => handleImport(displayResults)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Import All ({displayResults.length})
                </button>
              </div>
            )}
          </div>

          {/* Import feedback */}
          {importResult && (
            <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="flex gap-5 text-sm">
                <span className="font-semibold text-green-700">{importResult.imported} imported</span>
                <span className="text-blue-700">{importResult.updated} updated</span>
                <span className="text-slate-500">{importResult.skipped} skipped</span>
              </div>
              <a href="/leads" className="ml-auto text-sm font-medium text-slate-700 underline hover:text-slate-900">
                Open CRM →
              </a>
            </div>
          )}
          {importError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}

          {/* Results table */}
          {displayResults.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="w-10 px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={selected.size === displayResults.length ? deselectAll : selectAll}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {selected.size === displayResults.length
                            ? <CheckSquare className="h-4 w-4" />
                            : <Square className="h-4 w-4" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Business Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Website</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Reviews</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Rating</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayResults.map((lead, idx) => {
                      const isSelected = selected.has(idx);
                      const isHighValue = lead.lead_score >= 100;
                      return (
                        <tr
                          key={idx}
                          onClick={() => toggleRow(idx)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50"
                              : isHighValue
                              ? "bg-green-50/50 hover:bg-green-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleRow(idx)}
                              className={isSelected ? "text-blue-600" : "text-slate-300 hover:text-slate-500"}
                            >
                              {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{lead.name}</div>
                            {lead.opportunity_reason && (
                              <div className="mt-0.5 text-xs font-medium text-amber-600">{lead.opportunity_reason}</div>
                            )}
                            {lead.city && (
                              <div className="mt-0.5 text-xs text-slate-400">
                                {[lead.city, lead.country].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                              >
                                {lead.phone}
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="max-w-[180px] px-4 py-3">
                            {lead.website ? (
                              <a
                                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 truncate text-blue-600 hover:underline"
                              >
                                <span className="truncate text-xs">{lead.website.replace(/^https?:\/\//, "")}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <WebsiteStatusBadge status={lead.website_status} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {lead.review_count > 0 ? lead.review_count : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {lead.rating != null ? (
                              <span className="flex items-center gap-1 text-slate-700">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {Number(lead.rating).toFixed(1)}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-lg font-bold ${
                              lead.lead_score >= 100 ? "text-green-600"
                              : lead.lead_score >= 50 ? "text-amber-500"
                              : "text-slate-400"
                            }`}>
                              {lead.lead_score}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
