"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchBusinesses, logCall, updateBusiness, type Business, type ContactStatus } from "@/lib/api";
import { CONTACT_STATUS_LABELS, CONTACT_STATUS_COLORS, formatDate } from "@/lib/utils";
import { Phone, PhoneOff, PhoneCall, Clock, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TOMORROW = new Date(TODAY);
TOMORROW.setDate(TODAY.getDate() + 1);

function bucket(b: Business): "overdue" | "today" | "follow_up" | "new" {
  if (b.follow_up_date) {
    const d = new Date(b.follow_up_date);
    if (d < TODAY) return "overdue";
    if (d < TOMORROW) return "today";
    if (b.contact_status === "FOLLOW_UP") return "follow_up";
  }
  if (b.contact_status === "FOLLOW_UP") return "follow_up";
  return "new";
}

function OutcomeButton({
  icon: Icon,
  label,
  color,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  loading: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function CallCard({
  business,
  onLogged,
}: {
  business: Business;
  onLogged: (updated: Business) => void;
}) {
  const router = useRouter();
  const [logging, setLogging] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleLog(outcome: "ANSWERED" | "NO_ANSWER", e: React.MouseEvent) {
    e.stopPropagation();
    setLogging(outcome);
    try {
      await logCall(business.id, { outcome });
      const newStatus: ContactStatus = outcome === "ANSWERED" ? "CALLED" : "NO_ANSWER";
      const updated = await updateBusiness(business.id, { contact_status: newStatus });
      setDone(true);
      setTimeout(() => onLogged(updated), 600);
    } catch {
      setLogging(null);
    }
  }

  const b = bucket(business);
  const isOverdue = b === "overdue";
  const isToday = b === "today";

  return (
    <div
      onClick={() => router.push(`/leads/${business.id}`)}
      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md ${
        done ? "opacity-40" : ""
      } ${isOverdue ? "border-red-200" : isToday ? "border-amber-200" : "border-slate-200"}`}
    >
      {/* Left: status ring */}
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        isOverdue ? "bg-red-100" : isToday ? "bg-amber-100" : "bg-slate-100"
      }`}>
        <Phone className={`h-4 w-4 ${isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-slate-500"}`} />
      </div>

      {/* Middle: info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm">{business.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONTACT_STATUS_COLORS[business.contact_status as ContactStatus] ?? "bg-slate-100 text-slate-500"}`}>
            {CONTACT_STATUS_LABELS[business.contact_status as ContactStatus] ?? business.contact_status}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-blue-600 hover:underline"
            >
              {business.phone}
            </a>
          )}
          {business.city && <span>{business.city}</span>}
          {business.category && <span>{business.category}</span>}
        </div>

        {business.follow_up_date && (
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
            <Clock className="h-3 w-3" />
            {isOverdue ? `Overdue: ${formatDate(business.follow_up_date)}` : `Follow-up: ${formatDate(business.follow_up_date)}`}
          </div>
        )}

        {/* Quick-log buttons */}
        <div className="mt-2.5 flex flex-wrap gap-2">
          {done ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Logged
            </span>
          ) : (
            <>
              <OutcomeButton
                icon={PhoneCall}
                label="Answered"
                color="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                loading={logging !== null}
                onClick={(e) => handleLog("ANSWERED", e)}
              />
              <OutcomeButton
                icon={PhoneOff}
                label="No Answer"
                color="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                loading={logging !== null}
                onClick={(e) => handleLog("NO_ANSWER", e)}
              />
            </>
          )}
        </div>
      </div>

      {/* Right: chevron */}
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  iconColor,
  businesses,
  onLogged,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  businesses: Business[];
  onLogged: (updated: Business) => void;
}) {
  if (businesses.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
          {businesses.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {businesses.map((b) => (
          <CallCard key={b.id} business={b} onLogged={onLogged} />
        ))}
      </div>
    </div>
  );
}

export default function CallListPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchBusinesses({ contact_status: "NEW", has_phone: true }),
      fetchBusinesses({ contact_status: "FOLLOW_UP", has_phone: true }),
      fetchBusinesses({ contact_status: "NO_ANSWER", has_phone: true }),
    ])
      .then(([newLeads, followUps, noAnswers]) => {
        const seen = new Set<number>();
        const merged: Business[] = [];
        for (const b of [...followUps, ...noAnswers, ...newLeads]) {
          if (!seen.has(b.id)) { seen.add(b.id); merged.push(b); }
        }
        setBusinesses(merged);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleLogged(updated: Business) {
    setBusinesses((prev) => prev.filter((b) => b.id !== updated.id));
  }

  const overdue = businesses.filter((b) => bucket(b) === "overdue");
  const today   = businesses.filter((b) => bucket(b) === "today");
  const followUp = businesses.filter((b) => bucket(b) === "follow_up");
  const fresh   = businesses.filter((b) => bucket(b) === "new");

  const total = businesses.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Call List</h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? "Loading…" : `${total} lead${total !== 1 ? "s" : ""} to call — overdue follow-ups first`}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading call list…</div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-400" />
          <p className="font-semibold text-slate-700">All caught up!</p>
          <p className="mt-1 text-sm text-slate-500">No leads currently need a call.</p>
        </div>
      ) : (
        <>
          <Section title="Overdue Follow-ups" icon={AlertCircle} iconColor="text-red-500" businesses={overdue} onLogged={handleLogged} />
          <Section title="Follow-up Today" icon={Clock} iconColor="text-amber-500" businesses={today} onLogged={handleLogged} />
          <Section title="Needs Follow-up" icon={Clock} iconColor="text-sky-500" businesses={followUp} onLogged={handleLogged} />
          <Section title="New — Not Yet Called" icon={Phone} iconColor="text-slate-500" businesses={fresh} onLogged={handleLogged} />
        </>
      )}
    </div>
  );
}
