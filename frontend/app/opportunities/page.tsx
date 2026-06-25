"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchOpportunities, type Business, type ContactStatus } from "@/lib/api";
import { ContactStatusBadge } from "@/components/ContactStatusBadge";
import { Phone, Star, TrendingUp } from "lucide-react";

export default function OpportunitiesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOpportunities()
      .then(setBusinesses)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold text-slate-900">Top Opportunities</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Businesses with no website and a phone number — sorted by lead score. Call these first.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading…</div>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            No opportunities found. Import some leads first.
          </div>
        ) : (
          businesses.map((b, i) => (
            <div
              key={b.id}
              onClick={() => router.push(`/leads/${b.id}`)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 truncate">{b.name}</p>
                  <ContactStatusBadge status={b.contact_status as ContactStatus} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                  {b.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {b.phone}
                    </span>
                  )}
                  {(b.city || b.country) && (
                    <span>{[b.city, b.country].filter(Boolean).join(", ")}</span>
                  )}
                  {b.category && <span>{b.category}</span>}
                  {b.review_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      {b.rating != null ? Number(b.rating).toFixed(1) : "—"} ({b.review_count})
                    </span>
                  )}
                </div>
                {b.opportunity_reason && (
                  <p className="mt-0.5 text-xs font-medium text-amber-600">{b.opportunity_reason}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-2xl font-bold text-slate-900">{b.lead_score}</p>
                <p className="text-xs text-slate-400">score</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
