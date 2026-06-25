"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchBusinesses, updateBusiness, type Business, type ContactStatus } from "@/lib/api";
import {
  PIPELINE_STAGES,
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_COLORS,
  formatCurrency,
} from "@/lib/utils";
import { Phone, Globe, MapPin, DollarSign } from "lucide-react";

const STAGE_DESCRIPTIONS: Record<ContactStatus, string> = {
  NEW:           "Not yet contacted",
  CALLED:        "Call made, spoke to them",
  NO_ANSWER:     "Called, no answer",
  INTERESTED:    "Expressed interest",
  FOLLOW_UP:     "Needs follow-up",
  PROPOSAL_SENT: "Proposal delivered",
  WON:           "Deal closed",
  LOST:          "Not interested",
  CONTACTED:     "Previously contacted",
};

function PipelineCard({ business, onStatusChange }: {
  business: Business;
  onStatusChange: (id: number, status: ContactStatus) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
      onClick={() => router.push(`/leads/${business.id}`)}
    >
      <p className="font-semibold text-slate-900 text-sm leading-tight">{business.name}</p>

      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-slate-500">
        {business.phone && (
          <span className="flex items-center gap-0.5">
            <Phone className="h-3 w-3" />{business.phone}
          </span>
        )}
        {(business.city || business.country) && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {[business.city, business.country].filter(Boolean).join(", ")}
          </span>
        )}
      </div>

      {business.deal_value != null && (
        <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-green-700">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(business.deal_value)}
        </div>
      )}

      {business.follow_up_date && (
        <div className="mt-1 text-xs text-sky-700 font-medium">
          Follow-up: {new Date(business.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          business.website_status === "NO_WEBSITE" ? "bg-red-100 text-red-700" :
          business.website_status === "FACEBOOK_ONLY" ? "bg-orange-100 text-orange-700" :
          business.website_status === "FREE_BUILDER" ? "bg-yellow-100 text-yellow-700" :
          "bg-slate-100 text-slate-500"
        }`}>
          {business.website_status === "NO_WEBSITE" ? "No Site" :
           business.website_status === "FACEBOOK_ONLY" ? "FB Only" :
           business.website_status === "FREE_BUILDER" ? "Free Builder" :
           "Has Site"}
        </span>

        <select
          value={business.contact_status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(business.id, e.target.value as ContactStatus);
          }}
          className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  businesses,
  onStatusChange,
}: {
  stage: ContactStatus;
  businesses: Business[];
  onStatusChange: (id: number, status: ContactStatus) => void;
}) {
  const totalValue = businesses.reduce((sum, b) => sum + (b.deal_value ?? 0), 0);

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONTACT_STATUS_COLORS[stage]}`}>
              {CONTACT_STATUS_LABELS[stage]}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">{STAGE_DESCRIPTIONS[stage]}</p>
          </div>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {businesses.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="mt-1 text-xs font-semibold text-green-700">{formatCurrency(totalValue)}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {businesses.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
            Empty
          </div>
        ) : (
          businesses.map((b) => (
            <PipelineCard key={b.id} business={b} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetchBusinesses()
      .then(setBusinesses)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id: number, newStatus: ContactStatus) {
    try {
      const updated = await updateBusiness(id, { contact_status: newStatus });
      setBusinesses((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e) {
      setError(String(e));
    }
  }

  const filtered = businesses.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const byStage: Record<ContactStatus, Business[]> = {} as Record<ContactStatus, Business[]>;
  for (const stage of PIPELINE_STAGES) byStage[stage] = [];
  for (const b of filtered) {
    const stage = (b.contact_status as ContactStatus) in byStage
      ? b.contact_status as ContactStatus
      : "NEW";
    byStage[stage].push(b);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Pipeline</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading…" : `${businesses.length} leads across ${PIPELINE_STAGES.length} stages`}
          </p>
        </div>
        <input
          type="text"
          placeholder="Filter by name or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading pipeline…</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {PIPELINE_STAGES.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                businesses={byStage[stage]}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
