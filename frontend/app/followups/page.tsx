"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  type ClientFollowUp,
} from "@/lib/api";
import {
  Phone, Mail, Calendar, Clock, MessageSquare,
  CheckCircle2, AlertTriangle, Plus, Trash2, RefreshCw, Building2,
} from "lucide-react";

const TYPE_OPTS = ["CALL", "EMAIL", "MEETING", "WHATSAPP", "CUSTOM"];
const PRIORITY_OPTS = ["HIGH", "MEDIUM", "LOW"];

const TYPE_ICON: Record<string, React.ElementType> = {
  CALL: Phone, EMAIL: Mail, MEETING: Calendar, WHATSAPP: MessageSquare, CUSTOM: Clock,
};

const TYPE_COLOR: Record<string, string> = {
  CALL: "text-blue-600 bg-blue-50", EMAIL: "text-purple-600 bg-purple-50",
  MEETING: "text-green-600 bg-green-50", WHATSAPP: "text-emerald-600 bg-emerald-50",
  CUSTOM: "text-slate-600 bg-slate-100",
};

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-slate-100 text-slate-600",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-700", COMPLETED: "bg-green-100 text-green-700", SKIPPED: "bg-slate-100 text-slate-500",
};

function isOverdue(fu: ClientFollowUp) {
  return fu.status === "PENDING" && fu.follow_up_date < new Date().toISOString().slice(0, 10);
}

export default function FollowUpsPage() {
  const [items, setItems]       = useState<ClientFollowUp[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatus] = useState("PENDING");
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);

  // New follow-up form
  const [bizId, setBizId]       = useState("");
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime]         = useState("");
  const [type, setType]         = useState("CALL");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignedTo, setAssigned] = useState("");
  const [notes, setNotes]       = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchFollowUps(statusFilter !== "ALL" ? { status: statusFilter } : {});
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!bizId) return;
    setSaving(true);
    try {
      await createFollowUp({
        business_id: Number(bizId),
        follow_up_date: date,
        follow_up_time: time || null,
        type, priority,
        assigned_to: assignedTo || null,
        notes: notes || null,
      });
      setShowAdd(false);
      setBizId(""); setDate(new Date().toISOString().slice(0, 10));
      setTime(""); setType("CALL"); setPriority("MEDIUM"); setAssigned(""); setNotes("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function markDone(id: number) {
    await updateFollowUp(id, { status: "COMPLETED" });
    await load();
  }

  async function markSkip(id: number) {
    await updateFollowUp(id, { status: "SKIPPED" });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this follow-up?")) return;
    await deleteFollowUp(id);
    await load();
  }

  const overdueItems  = items.filter(isOverdue);
  const todayItems    = items.filter(f => f.follow_up_date === new Date().toISOString().slice(0, 10) && !isOverdue(f));
  const upcomingItems = items.filter(f => f.follow_up_date > new Date().toISOString().slice(0, 10));
  const otherItems    = statusFilter !== "PENDING" ? items : [];

  function Section({ title, badge, color, rows }: { title: string; badge?: string; color: string; rows: ClientFollowUp[] }) {
    if (!rows.length) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</h2>
          {badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color} bg-current/10`}>{badge}</span>}
        </div>
        {rows.map(fu => {
          const Icon = TYPE_ICON[fu.type] ?? Clock;
          const overdue = isOverdue(fu);
          return (
            <div key={fu.id} className={`flex items-start gap-3 rounded-xl border p-4 bg-white ${overdue ? "border-red-200" : "border-slate-200"} shadow-sm`}>
              <div className={`rounded-lg p-2 shrink-0 ${TYPE_COLOR[fu.type] ?? "bg-slate-100 text-slate-600"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {fu.business_name ? (
                    <Link href={`/leads/${fu.business_id}`} className="text-sm font-semibold text-slate-800 hover:text-blue-600">
                      {fu.business_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">Lead #{fu.business_id}</span>
                  )}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE[fu.priority]}`}>{fu.priority}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[fu.status]}`}>{fu.status}</span>
                  {overdue && <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600"><AlertTriangle className="h-3 w-3" />OVERDUE</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{fu.follow_up_date}{fu.follow_up_time ? ` at ${fu.follow_up_time.slice(0, 5)}` : ""}</span>
                  {fu.assigned_to && <span>→ {fu.assigned_to}</span>}
                  {fu.notes && <span className="italic truncate max-w-xs">{fu.notes}</span>}
                </div>
              </div>
              {fu.status === "PENDING" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => markDone(fu.id)} className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100">Done</button>
                  <button onClick={() => markSkip(fu.id)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Skip</button>
                  <button onClick={() => remove(fu.id)} className="rounded-lg border border-red-100 bg-red-50 p-1 text-red-400 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {fu.status !== "PENDING" && (
                <button onClick={() => remove(fu.id)} className="shrink-0 rounded-lg border border-red-100 bg-red-50 p-1 text-red-400 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Follow-ups</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage all scheduled follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" /> New Follow-up
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-blue-800">New Follow-up</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Business ID *</label>
              <input required type="number" value={bizId} onChange={e => setBizId(e.target.value)}
                placeholder="e.g. 123" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Date *</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                {TYPE_OPTS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Assigned To</label>
              <input type="text" value={assignedTo} onChange={e => setAssigned(e.target.value)}
                placeholder="Name" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {["PENDING", "COMPLETED", "SKIPPED", "ALL"].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-slate-200">
          <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No follow-ups found</p>
          <p className="mt-1 text-xs text-slate-400">Create one from any lead page, or use the button above.</p>
        </div>
      ) : statusFilter === "PENDING" ? (
        <>
          <Section title="Overdue" badge={String(overdueItems.length)} color="text-red-600" rows={overdueItems} />
          <Section title="Today" badge={String(todayItems.length)} color="text-blue-600" rows={todayItems} />
          <Section title="Upcoming" color="text-slate-500" rows={upcomingItems} />
        </>
      ) : (
        <div className="space-y-2">
          {items.map(fu => {
            const Icon = TYPE_ICON[fu.type] ?? Clock;
            return (
              <div key={fu.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`rounded-lg p-2 shrink-0 ${TYPE_COLOR[fu.type] ?? "bg-slate-100 text-slate-600"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {fu.business_name ? (
                      <Link href={`/leads/${fu.business_id}`} className="text-sm font-semibold text-slate-800 hover:text-blue-600">{fu.business_name}</Link>
                    ) : (
                      <span className="text-sm text-slate-500">Lead #{fu.business_id}</span>
                    )}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[fu.status]}`}>{fu.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{fu.follow_up_date} · {fu.type}</p>
                </div>
                <button onClick={() => remove(fu.id)} className="shrink-0 rounded-lg border border-red-100 bg-red-50 p-1 text-red-400 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
