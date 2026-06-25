"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchBusiness,
  updateBusiness,
  logCall,
  fetchCalls,
  addNote,
  fetchNotes,
  discoverEmail,
  type Business,
  type ContactStatus,
  type CallLog,
  type BusinessNote,
  type CallOutcome,
} from "@/lib/api";
import { WebsiteStatusBadge } from "@/components/WebsiteStatusBadge";
import { ContactStatusBadge } from "@/components/ContactStatusBadge";
import {
  PIPELINE_STAGES,
  CONTACT_STATUS_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import {
  ArrowLeft, Star, Phone, Mail, Globe, MapPin, Tag,
  PhoneCall, PhoneMissed, PhoneOff, Voicemail,
  MessageSquare, Calendar, DollarSign, CheckCircle2,
} from "lucide-react";

const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  ANSWERED: "Answered",
  NO_ANSWER: "No Answer",
  VOICEMAIL: "Voicemail",
  BUSY: "Busy",
};

const CALL_OUTCOME_ICONS: Record<CallOutcome, React.ElementType> = {
  ANSWERED: PhoneCall,
  NO_ANSWER: PhoneMissed,
  VOICEMAIL: Voicemail,
  BUSY: PhoneOff,
};

const CALL_OUTCOME_COLORS: Record<CallOutcome, string> = {
  ANSWERED: "text-green-600",
  NO_ANSWER: "text-orange-500",
  VOICEMAIL: "text-blue-500",
  BUSY: "text-red-500",
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bId = Number(id);

  const [business, setBusiness] = useState<Business | null>(null);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [notes, setNotes] = useState<BusinessNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [contactStatus, setContactStatus] = useState<ContactStatus>("NEW");
  const [dealValue, setDealValue] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [discoveringEmail, setDiscoveringEmail] = useState(false);

  // Log call state
  const [showCallForm, setShowCallForm] = useState(false);
  const [callOutcome, setCallOutcome] = useState<CallOutcome | "">("");
  const [callNotes, setCallNotes] = useState("");
  const [loggingCall, setLoggingCall] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, c, n] = await Promise.all([
        fetchBusiness(bId),
        fetchCalls(bId),
        fetchNotes(bId),
      ]);
      setBusiness(b);
      setCalls(c);
      setNotes(n);
      setContactStatus(b.contact_status as ContactStatus);
      setDealValue(b.deal_value != null ? String(b.deal_value) : "");
      setFollowUpDate(b.follow_up_date ? b.follow_up_date.split("T")[0] : "");
    } catch (e) {
      setError(String(e));
    }
  }, [bId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    try {
      const updated = await updateBusiness(business.id, {
        contact_status: contactStatus,
        deal_value: dealValue ? Number(dealValue) : null,
        follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : null,
      });
      setBusiness(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim() || !business) return;
    setAddingNote(true);
    try {
      const note = await addNote(business.id, noteText.trim());
      setNotes([note, ...notes]);
      setNoteText("");
    } catch (e) {
      setError(String(e));
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDiscoverEmail() {
    if (!business) return;
    setDiscoveringEmail(true);
    try {
      const updated = await discoverEmail(business.id);
      setBusiness(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setDiscoveringEmail(false);
    }
  }

  async function handleLogCall() {
    if (!business) return;
    setLoggingCall(true);
    try {
      const log = await logCall(business.id, {
        outcome: callOutcome || undefined,
        notes: callNotes || undefined,
      });
      setCalls([log, ...calls]);
      setCallNotes("");
      setCallOutcome("");
      setShowCallForm(false);
      // Refresh business to get updated status
      const updated = await fetchBusiness(business.id);
      setBusiness(updated);
      setContactStatus(updated.contact_status as ContactStatus);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoggingCall(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
    );
  }

  if (!business) {
    return <div className="py-12 text-center text-slate-400">Loading…</div>;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid gap-4 lg:grid-cols-3">

        {/* ── Left column: business info + activity ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Business card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{business.name}</h1>
                {business.opportunity_reason && (
                  <p className="mt-1 text-sm font-medium text-amber-600">{business.opportunity_reason}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <WebsiteStatusBadge status={business.website_status} />
                <ContactStatusBadge status={business.contact_status} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  {business.phone}
                </a>
              )}
              {business.email ? (
                <div className="flex items-center gap-2">
                  <a href={`mailto:${business.email}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    {business.email}
                  </a>
                  {business.email_source && (
                    <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">
                      {business.email_source}
                    </span>
                  )}
                </div>
              ) : business.website ? (
                <button
                  type="button"
                  onClick={handleDiscoverEmail}
                  disabled={discoveringEmail}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {discoveringEmail ? "Scanning website…" : "Find Email"}
                </button>
              ) : null}
              {business.website && (
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">{business.website}</span>
                </a>
              )}
              {(business.city || business.country) && (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  {[business.address, business.city, business.country].filter(Boolean).join(", ")}
                </span>
              )}
              {business.category && (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <Tag className="h-4 w-4 text-slate-400 shrink-0" />
                  {business.category}
                </span>
              )}
            </div>

            {business.review_count > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{business.rating != null ? Number(business.rating).toFixed(1) : "—"}</span>
                <span className="text-sm text-slate-500">({business.review_count} reviews)</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {business.google_maps_url && (
                <a href={business.google_maps_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Google Maps
                </a>
              )}
              {business.facebook_url && (
                <a href={business.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Facebook
                </a>
              )}
            </div>
          </div>

          {/* Call history */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-slate-400" />
                Call History
                {calls.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{calls.length}</span>
                )}
              </h2>
              <button
                onClick={() => setShowCallForm((v) => !v)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                + Log Call
              </button>
            </div>

            {showCallForm && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Outcome</label>
                  <div className="flex flex-wrap gap-2">
                    {(["ANSWERED", "NO_ANSWER", "VOICEMAIL", "BUSY"] as CallOutcome[]).map((o) => {
                      const Icon = CALL_OUTCOME_ICONS[o];
                      const active = callOutcome === o;
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setCallOutcome(active ? "" : o)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {CALL_OUTCOME_LABELS[o]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Notes from this call…"
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleLogCall}
                    disabled={loggingCall}
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loggingCall ? "Saving…" : "Save Call"}
                  </button>
                  <button
                    onClick={() => setShowCallForm(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {calls.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No calls logged yet.</p>
            ) : (
              <div className="space-y-2">
                {calls.map((c) => {
                  const outcome = c.outcome as CallOutcome | null;
                  const Icon = outcome ? CALL_OUTCOME_ICONS[outcome] : PhoneCall;
                  const color = outcome ? CALL_OUTCOME_COLORS[outcome] : "text-slate-400";
                  return (
                    <div key={c.id} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            {outcome ? CALL_OUTCOME_LABELS[outcome] : "Call"}
                          </span>
                          <span className="text-xs text-slate-400 shrink-0">{formatDateTime(c.called_at)}</span>
                        </div>
                        {c.notes && <p className="mt-0.5 text-xs text-slate-600">{c.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes history */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              Notes
              {notes.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{notes.length}</span>
              )}
            </h2>

            <div className="mb-3 flex gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || addingNote}
                className="self-end rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                {addingNote ? "…" : "Add"}
              </button>
            </div>

            {notes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-sm text-slate-800">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar: pipeline controls ── */}
        <div className="space-y-4">

          {/* Pipeline stage */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Pipeline Stage</h2>
            <div className="flex flex-col gap-1.5">
              {PIPELINE_STAGES.filter(s => s !== "CONTACTED").map((s) => {
                const active = contactStatus === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setContactStatus(s)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-left transition-all ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    {active && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    {!active && <span className="h-3.5 w-3.5 shrink-0" />}
                    {CONTACT_STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deal value */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-400" />
              Deal Value
            </h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">£</span>
              <input
                type="number"
                min="0"
                step="100"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            {business.deal_value != null && dealValue === String(business.deal_value) && (
              <p className="mt-1 text-xs text-slate-400">Current: {formatCurrency(business.deal_value)}</p>
            )}
          </div>

          {/* Follow-up date */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Follow-up Date
            </h2>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>

          {/* Opportunity score breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Opportunity Score</h2>
              <span className="text-2xl font-bold text-slate-900">{business.lead_score}</span>
            </div>
            <div className="mb-3 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.min(100, Math.round(business.lead_score / 1.6))}%` }}
              />
            </div>
            <div className="space-y-1.5">
              {((): { label: string; pts: number }[] => {
                const items: { label: string; pts: number }[] = [];
                if (business.website_status === "NO_WEBSITE") items.push({ label: "No Website", pts: 100 });
                else if (business.website_status === "FACEBOOK_ONLY") items.push({ label: "Facebook Only", pts: 80 });
                else if (business.website_status === "FREE_BUILDER") items.push({ label: "Free Website Builder", pts: 50 });
                if (business.phone) items.push({ label: "Has Phone", pts: 20 });
                if (business.email) items.push({ label: "Has Email", pts: 20 });
                if (business.rating != null && Number(business.rating) > 4.5) items.push({ label: "Rating > 4.5", pts: 20 });
                if (business.review_count > 50) items.push({ label: "Reviews > 50", pts: 30 });
                else if (business.review_count > 25) items.push({ label: "Reviews > 25", pts: 20 });
                else if (business.review_count > 10) items.push({ label: "Reviews > 10", pts: 10 });
                return items;
              })().map(({ label, pts }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-green-700">+{pts}</span>
                </div>
              ))}
            </div>
            {/* Priority label */}
            {(() => {
              const isHot = business.website_status === "NO_WEBSITE" && !!business.phone;
              const isWarm = ["FACEBOOK_ONLY", "FREE_BUILDER"].includes(business.website_status) ||
                (business.website_status === "NO_WEBSITE" && !business.phone);
              if (isHot) return (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-center">
                  <span className="text-sm font-bold text-red-700">🔥 HOT — Call First</span>
                </div>
              );
              if (isWarm) return (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-center">
                  <span className="text-sm font-bold text-amber-700">WARM</span>
                </div>
              );
              return (
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-center">
                  <span className="text-sm font-medium text-slate-500">COLD</span>
                </div>
              );
            })()}
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Added</span>
              <span className="font-medium text-slate-700">{formatDate(business.created_at)}</span>
            </div>
            {business.called_at && (
              <div className="flex justify-between">
                <span>First call</span>
                <span className="font-medium text-slate-700">{formatDate(business.called_at)}</span>
              </div>
            )}
            {business.proposal_sent_at && (
              <div className="flex justify-between">
                <span>Proposal sent</span>
                <span className="font-medium text-slate-700">{formatDate(business.proposal_sent_at)}</span>
              </div>
            )}
            {business.won_at && (
              <div className="flex justify-between">
                <span className="text-green-600 font-semibold">Won</span>
                <span className="font-medium text-green-700">{formatDate(business.won_at)}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
