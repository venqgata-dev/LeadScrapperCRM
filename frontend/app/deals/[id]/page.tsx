"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy, XCircle, Building2, User, Calendar, DollarSign,
  Percent, ArrowLeft, Edit2, Save, X, ChevronRight,
  Folder, AlertTriangle,
} from "lucide-react";
import {
  fetchDeals, updateDeal, markDealWon, markDealLost, deleteDeal,
  fetchBusinessDeals, type Deal,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  OPEN:      { label: "Open",      color: "text-blue-700",  bg: "bg-blue-100",  ring: "ring-blue-200" },
  WON:       { label: "Won",       color: "text-green-700", bg: "bg-green-100", ring: "ring-green-200" },
  LOST:      { label: "Lost",      color: "text-red-700",   bg: "bg-red-100",   ring: "ring-red-200" },
  CANCELLED: { label: "Cancelled", color: "text-slate-600", bg: "bg-slate-100", ring: "ring-slate-200" },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt(v: string | null) {
  if (!v) return "—";
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `€${n.toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

// ─── Mark Won modal ───────────────────────────────────────────────────────────

function MarkWonModal({ deal, onClose, onDone }: { deal: Deal; onClose: () => void; onDone: (d: Deal) => void }) {
  const [reason, setReason]    = useState("");
  const [loading, setLoading]  = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const updated = await markDealWon(deal.id, { won_reason: reason || undefined, create_project: true });
      onDone(updated);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100">
            <Trophy className="h-4.5 w-4.5 text-green-600" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Mark Deal as Won 🎉</h2>
            <p className="text-xs text-slate-500">This will create a Website Project automatically</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Why did you win? (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Great pricing, strong relationship, perfect timing…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Marking Won…" : "Mark Won & Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Lost modal ──────────────────────────────────────────────────────────

function MarkLostModal({ deal, onClose, onDone }: { deal: Deal; onClose: () => void; onDone: (d: Deal) => void }) {
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const updated = await markDealLost(deal.id, { lost_reason: reason });
      onDone(updated);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
            <XCircle className="h-4.5 w-4.5 text-red-600" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Mark Deal as Lost</h2>
            <p className="text-xs text-slate-500">Record what went wrong for future reference</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason for losing <span className="text-red-500">*</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Price too high, went with competitor, no budget…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={submit}
            disabled={loading || !reason.trim()}
            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Mark Lost"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [deal, setDeal]               = useState<Deal | null>(null);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(false);
  const [showWon, setShowWon]         = useState(false);
  const [showLost, setShowLost]       = useState(false);
  const [form, setForm]               = useState<Partial<Deal>>({});
  const [saving, setSaving]           = useState(false);

  async function load() {
    setLoading(true);
    try {
      const all = await fetchDeals();
      const found = all.find(d => d.id === Number(id));
      if (found) {
        setDeal(found);
        setForm(found);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!deal) return;
    setSaving(true);
    try {
      const updated = await updateDeal(deal.id, form);
      setDeal(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deal || !confirm(`Delete "${deal.deal_name}"? This cannot be undone.`)) return;
    await deleteDeal(deal.id);
    router.push("/deals");
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="h-48 rounded-xl bg-slate-100" />
    </div>
  );

  if (!deal) return (
    <div className="py-20 text-center text-slate-400">
      <AlertTriangle className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p>Deal not found</p>
      <Link href="/deals" className="mt-2 text-sm text-blue-600 hover:underline">← Back to Deals</Link>
    </div>
  );

  const meta = STATUS_META[deal.status] ?? STATUS_META.OPEN;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/deals" className="hover:text-slate-800">Deals</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-800 font-medium">{deal.deal_name}</span>
      </div>

      {/* Hero card */}
      <div className={`rounded-2xl border-2 bg-white p-6 shadow-sm ${meta.ring} ring-2`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            {editing ? (
              <input
                value={form.deal_name ?? ""}
                onChange={e => setForm(f => ({ ...f, deal_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">{deal.deal_name}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.color}`}>
                {meta.label}
              </span>
              {deal.business_name && (
                <Link href={`/leads/${deal.business_id}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
                  <Building2 className="h-3.5 w-3.5" />
                  {deal.business_name}
                </Link>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {deal.status === "OPEN" && (
              <>
                <button
                  onClick={() => setShowWon(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <Trophy className="h-3.5 w-3.5" /> Mark Won
                </button>
                <button
                  onClick={() => setShowLost(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <XCircle className="h-3.5 w-3.5" /> Mark Lost
                </button>
              </>
            )}
            {editing ? (
              <>
                <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditing(false); setForm(deal); }} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Deal Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Deal Details</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Salesperson</p>
              {editing ? (
                <input value={form.salesperson ?? ""} onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))}
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
              ) : <p className="mt-0.5 text-sm text-slate-800">{deal.salesperson ?? "—"}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Estimated Value</p>
              {editing ? (
                <input type="number" value={form.estimated_value ?? ""} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))}
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
              ) : <p className="mt-0.5 text-sm font-semibold text-slate-800">{fmt(deal.estimated_value)}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Probability</p>
              {editing ? (
                <input type="number" min={0} max={100} value={form.probability ?? ""} onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))}
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
              ) : (
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-slate-200">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${deal.probability ?? 0}%` }} />
                  </div>
                  <span className="text-sm text-slate-700">{deal.probability ?? 0}%</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Expected Close</p>
              {editing ? (
                <input type="date" value={form.expected_close_date ?? ""} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))}
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
              ) : <p className="mt-0.5 text-sm text-slate-800">{fmtDate(deal.expected_close_date)}</p>}
            </div>
            {deal.actual_close_date && (
              <div>
                <p className="text-xs font-medium text-slate-500">Actual Close</p>
                <p className="mt-0.5 text-sm text-slate-800">{fmtDate(deal.actual_close_date)}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
            {editing ? (
              <textarea value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            ) : (
              <p className="text-sm text-slate-600 whitespace-pre-line">{deal.notes ?? "No notes"}</p>
            )}
          </div>
        </div>

        {/* Win/Loss info */}
        <div className="space-y-4">
          {deal.status === "WON" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-green-600" />
                <p className="text-sm font-semibold text-green-800">Deal Won</p>
              </div>
              <p className="text-xs text-green-700">{deal.won_reason ?? "No reason recorded"}</p>
              <p className="mt-2 text-xs text-green-600">Closed: {fmtDate(deal.actual_close_date)}</p>
            </div>
          )}
          {deal.status === "LOST" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-semibold text-red-800">Deal Lost</p>
              </div>
              <p className="text-xs text-red-700">{deal.lost_reason ?? "No reason recorded"}</p>
              <p className="mt-2 text-xs text-red-600">Closed: {fmtDate(deal.actual_close_date)}</p>
            </div>
          )}

          {/* Project link */}
          {deal.status === "WON" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Website Project</p>
              </div>
              <Link
                href={`/projects?deal=${deal.id}`}
                className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
              >
                <span>View Project</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Danger zone */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Danger Zone</p>
            <button
              onClick={handleDelete}
              className="w-full rounded-lg border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete Deal
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWon && (
        <MarkWonModal deal={deal} onClose={() => setShowWon(false)} onDone={d => { setDeal(d); setShowWon(false); }} />
      )}
      {showLost && (
        <MarkLostModal deal={deal} onClose={() => setShowLost(false)} onDone={d => { setDeal(d); setShowLost(false); }} />
      )}
    </div>
  );
}
