"use client";

import { useEffect, useState } from "react";
import { fetchProviders, scrapeLeads, type ProviderStatus, type ImportResult } from "@/lib/api";
import { CheckCircle, AlertCircle, Search, Info } from "lucide-react";

const UK_CITIES = ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Bristol", "Sheffield", "Edinburgh", "Glasgow", "Cardiff"];
const BG_CITIES = ["Sofia", "Varna", "Plovdiv", "Burgas", "Ruse", "Stara Zagora", "Pleven", "Sliven"];
const COMMON_KEYWORDS = [
  "plumber", "electrician", "roofer", "builder", "painter decorator",
  "carpenter", "locksmith", "cleaning services", "landscaper", "plasterer",
  "restaurant", "cafe", "hairdresser", "beauty salon", "dentist",
  "solicitor", "accountant", "estate agent", "mechanic", "gym",
];

export default function ScrapePage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [source, setSource] = useState("yell");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders().then((ps) => {
      setProviders(ps);
      const first = ps.find((p) => p.available);
      if (first) setSource(first.source);
    });
  }, []);

  const selectedProvider = providers.find((p) => p.source === source);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !location.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const r = await scrapeLeads({ source, keyword: keyword.trim(), location: location.trim() });
      setResult(r);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Scrape Leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          Collect businesses from UK and Bulgaria directories. Results are automatically classified and scored.
        </p>
      </div>

      {/* Provider cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {providers.map((p) => (
          <button
            key={p.source}
            type="button"
            onClick={() => p.available && setSource(p.source)}
            disabled={!p.available}
            className={`rounded-xl border p-4 text-left transition-all ${
              source === p.source
                ? "border-slate-900 bg-slate-900 text-white shadow-md"
                : p.available
                ? "border-slate-200 bg-white hover:border-slate-400"
                : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
            }`}
          >
            <p className={`font-semibold text-sm ${source === p.source ? "text-white" : "text-slate-900"}`}>
              {p.label}
            </p>
            <p className={`mt-0.5 text-xs leading-relaxed ${source === p.source ? "text-slate-300" : "text-slate-400"}`}>
              {p.available ? "Available" : "Needs API key"}
            </p>
          </button>
        ))}
      </div>

      {selectedProvider && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{selectedProvider.note}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Keyword */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Business Type / Keyword</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. plumber, electrician, restaurant…"
                required
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COMMON_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setKeyword(kw)}
                  className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London, Sofia, Manchester…"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <div className="mt-2">
              <p className="mb-1 text-xs font-medium text-slate-400">United Kingdom</p>
              <div className="flex flex-wrap gap-1.5">
                {UK_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLocation(c)}
                    className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
              {source === "google_maps" && (
                <>
                  <p className="mb-1 mt-2 text-xs font-medium text-slate-400">Bulgaria</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BG_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setLocation(c)}
                        className="rounded-full border border-orange-200 px-2.5 py-0.5 text-xs text-orange-600 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedProvider?.available}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <Search className="h-4 w-4" />
            {loading ? "Scraping — this may take a minute…" : "Scrape Leads"}
          </button>
        </form>

        {result && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-800">Scrape complete</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-green-600">New Leads</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-600">{result.skipped}</p>
                <p className="text-xs text-slate-500">Skipped</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a href="/leads" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                View Leads
              </a>
              <a href="/opportunities" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Opportunities
              </a>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
