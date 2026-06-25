"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchBusinesses, type Business, type WebsiteStatus, type ContactStatus } from "@/lib/api";
import { WebsiteStatusBadge } from "@/components/WebsiteStatusBadge";
import { ContactStatusBadge } from "@/components/ContactStatusBadge";
import {
  WEBSITE_STATUS_LABELS,
  PIPELINE_STAGES,
  CONTACT_STATUS_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/utils";
import { Search, SlidersHorizontal, Star, Calendar, DollarSign, Flame, Phone } from "lucide-react";

type Priority = "HOT" | "WARM" | "COLD" | null;

function getPriority(b: { website_status: string; phone: string | null }): Priority {
  if (b.website_status === "NO_WEBSITE" && b.phone) return "HOT";
  if (b.website_status === "FACEBOOK_ONLY" || b.website_status === "NO_WEBSITE" || b.website_status === "FREE_BUILDER") return "WARM";
  if (b.website_status === "HAS_WEBSITE") return "COLD";
  return null;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  if (!priority) return null;
  const cfg = {
    HOT:  { cls: "bg-red-100 text-red-700 border-red-200",    label: "HOT" },
    WARM: { cls: "bg-amber-100 text-amber-700 border-amber-200", label: "WARM" },
    COLD: { cls: "bg-slate-100 text-slate-500 border-slate-200", label: "COLD" },
  }[priority];
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const WEBSITE_STATUS_OPTIONS: WebsiteStatus[] = [
  "NO_WEBSITE", "FACEBOOK_ONLY", "FREE_BUILDER", "BROKEN_WEBSITE", "HAS_WEBSITE",
];

function LeadsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [websiteStatus, setWebsiteStatus] = useState<WebsiteStatus | "">(
    (searchParams.get("website_status") as WebsiteStatus) ?? ""
  );
  const [country, setCountry] = useState(searchParams.get("country") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [hasPhone, setHasPhone] = useState<"" | "true" | "false">(
    (searchParams.get("has_phone") as "" | "true" | "false") ?? ""
  );
  const [hasEmail, setHasEmail] = useState<"" | "true" | "false">(
    (searchParams.get("has_email") as "" | "true" | "false") ?? ""
  );
  const [contactStatus, setContactStatus] = useState<ContactStatus | "">(
    (searchParams.get("contact_status") as ContactStatus) ?? ""
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchBusinesses({
      search: search || undefined,
      website_status: (websiteStatus as WebsiteStatus) || undefined,
      country: country || undefined,
      city: city || undefined,
      category: category || undefined,
      has_phone: hasPhone === "true" ? true : hasPhone === "false" ? false : undefined,
      has_email: hasEmail === "true" ? true : hasEmail === "false" ? false : undefined,
      contact_status: (contactStatus as ContactStatus) || undefined,
    })
      .then(setBusinesses)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [search, websiteStatus, country, city, category, hasPhone, hasEmail, contactStatus]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">{loading ? "Loading…" : `${businesses.length} results`}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/pipeline"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Pipeline view
          </a>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Quick-filter pills */}
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            { label: "No Website",    value: "NO_WEBSITE"    as WebsiteStatus, cls: "border-red-200 text-red-700 hover:bg-red-50",    active: "bg-red-600 border-red-600 text-white"    },
            { label: "Facebook Only", value: "FACEBOOK_ONLY" as WebsiteStatus, cls: "border-orange-200 text-orange-700 hover:bg-orange-50", active: "bg-orange-600 border-orange-600 text-white" },
            { label: "Free Builder",  value: "FREE_BUILDER"  as WebsiteStatus, cls: "border-amber-200 text-amber-700 hover:bg-amber-50",  active: "bg-amber-500 border-amber-500 text-white"  },
          ] as const
        ).map(({ label, value, cls, active: activeCls }) => (
          <button
            key={value}
            type="button"
            onClick={() => setWebsiteStatus(websiteStatus === value ? "" : value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              websiteStatus === value ? activeCls : cls
            }`}
          >
            {label}
          </button>
        ))}

        {/* Pipeline stage quick filters */}
        {(["NEW", "INTERESTED", "FOLLOW_UP", "PROPOSAL_SENT"] as ContactStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setContactStatus(contactStatus === s ? "" : s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              contactStatus === s
                ? "bg-slate-900 border-slate-900 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {CONTACT_STATUS_LABELS[s]}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setHasPhone(hasPhone === "true" ? "" : "true")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            hasPhone === "true"
              ? "bg-slate-900 border-slate-900 text-white"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Has Phone
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Website Status</label>
            <select value={websiteStatus} onChange={(e) => setWebsiteStatus(e.target.value as WebsiteStatus | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none">
              <option value="">All</option>
              {WEBSITE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{WEBSITE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Pipeline Stage</label>
            <select value={contactStatus} onChange={(e) => setContactStatus(e.target.value as ContactStatus | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none">
              <option value="">All</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none">
              <option value="">All</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Bulgaria">Bulgaria</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. London"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Plumber"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Has Phone</label>
            <select value={hasPhone} onChange={(e) => setHasPhone(e.target.value as "" | "true" | "false")}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none">
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Has Email</label>
            <select value={hasEmail} onChange={(e) => setHasEmail(e.target.value as "" | "true" | "false")}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none">
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch(""); setWebsiteStatus(""); setCountry(""); setCity("");
                setCategory(""); setHasPhone(""); setHasEmail(""); setContactStatus("");
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Business</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Location</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Website</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Deal</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Follow-up</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 hidden xl:table-cell">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">No leads found.</td></tr>
              ) : (
                businesses.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => router.push(`/leads/${b.id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{b.name}</span>
                        <PriorityBadge priority={getPriority(b)} />
                        {getPriority(b) === "HOT" && (
                          <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                            <Phone className="h-2.5 w-2.5" />
                            Call First
                          </span>
                        )}
                      </div>
                      {b.category && (
                        <div className="text-xs text-slate-400 mt-0.5">{b.category}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {[b.city, b.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <WebsiteStatusBadge status={b.website_status} />
                    </td>
                    <td className="px-4 py-3">
                      <ContactStatusBadge status={b.contact_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium hidden lg:table-cell whitespace-nowrap">
                      {b.deal_value != null ? (
                        <span className="flex items-center gap-1 text-green-700">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCurrency(b.deal_value)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">
                      {b.follow_up_date ? (
                        <span className="flex items-center gap-1 text-sky-700 text-xs font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(b.follow_up_date)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{b.lead_score}</span>
                        {b.review_count > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-400">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {b.rating != null ? Number(b.rating).toFixed(1) : "—"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-400">Loading…</div>}>
      <LeadsInner />
    </Suspense>
  );
}
