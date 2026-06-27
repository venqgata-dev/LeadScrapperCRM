"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2, User, Calendar, ChevronRight, Edit2, Save, X,
  CheckCircle2, Circle, Plus, Trash2, MessageSquare, Send,
  Lock, Globe, Server, Eye, EyeOff, AlertTriangle,
  DollarSign, TrendingUp, RefreshCw,
} from "lucide-react";
import {
  fetchProjectById, updateProjectExt, fetchDeliverables, updateDeliverable,
  createDeliverable, deleteDeliverable, fetchComments, createComment, deleteComment,
  fetchCredentials, upsertCredentials,
  type ProjectExtended, type Deliverable, type ProjectComment, type ClientCredential,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  "PLANNING","CONTENT_COLLECTION","DESIGN","DEVELOPMENT",
  "CLIENT_REVIEW","SEO","TESTING","DEPLOYMENT","COMPLETED",
];

const STAGE_LABELS: Record<string, string> = {
  PLANNING: "Planning", CONTENT_COLLECTION: "Content Collection",
  DESIGN: "Design", DEVELOPMENT: "Development",
  CLIENT_REVIEW: "Client Review", SEO: "SEO",
  TESTING: "Testing", DEPLOYMENT: "Deployment", COMPLETED: "Completed",
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-slate-100 text-slate-600",
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtMoney(v: string | null | undefined) {
  if (!v) return "—";
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `€${n.toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
}
function fmtTs(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Deliverables ─────────────────────────────────────────────────────────────

function DeliverablesSection({ projectId }: { projectId: number }) {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding]   = useState(false);

  useEffect(() => {
    fetchDeliverables(projectId).then(setItems);
  }, [projectId]);

  async function toggle(item: Deliverable) {
    const next = item.status === "DONE" ? "PENDING" : "DONE";
    const updated = await updateDeliverable(item.id, { status: next });
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  }

  async function add() {
    if (!newName.trim()) return;
    const d = await createDeliverable(projectId, newName.trim());
    setItems(prev => [...prev, d]);
    setNewName("");
    setAdding(false);
  }

  async function remove(id: number) {
    await deleteDeliverable(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const done = items.filter(i => i.status === "DONE").length;

  return (
    <Section
      title={`Deliverables (${done}/${items.length})`}
      icon={CheckCircle2}
      action={
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      }
    >
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 group">
            <button onClick={() => toggle(item)} className="shrink-0">
              {item.status === "DONE"
                ? <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                : <Circle className="h-4.5 w-4.5 text-slate-300 hover:text-slate-400" />}
            </button>
            <span className={`flex-1 text-sm ${item.status === "DONE" ? "line-through text-slate-400" : "text-slate-700"}`}>
              {item.name}
            </span>
            {item.assigned_to && (
              <span className="text-[10px] text-slate-400">{item.assigned_to}</span>
            )}
            {item.completed_at && (
              <span className="text-[10px] text-slate-400">{fmtDate(item.completed_at)}</span>
            )}
            <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {adding && (
          <div className="flex items-center gap-2 mt-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Deliverable name…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={add} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Add</button>
            <button onClick={() => setAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        )}
        {items.length === 0 && !adding && (
          <p className="text-sm text-slate-400">No deliverables yet. Add the first one.</p>
        )}
        {/* Progress */}
        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Overall progress</span>
              <span>{Math.round(done / items.length * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${items.length > 0 ? (done / items.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Comments ─────────────────────────────────────────────────────────────────

function CommentsSection({ projectId }: { projectId: number }) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [author, setAuthor]     = useState("You");
  const [body, setBody]         = useState("");
  const [replyTo, setReplyTo]   = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments(projectId).then(setComments);
  }, [projectId]);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const c = await createComment(projectId, author, body, replyTo ?? undefined);
      if (replyTo) {
        setComments(prev => prev.map(cm =>
          cm.id === replyTo ? { ...cm, replies: [...cm.replies, c] } : cm
        ));
      } else {
        setComments(prev => [...prev, c]);
      }
      setBody("");
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section title="Internal Comments" icon={MessageSquare}>
      <div className="space-y-4">
        {comments.map(c => (
          <div key={c.id} className="space-y-2">
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {c.author.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                  <span className="text-[10px] text-slate-400">{fmtTs(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line">{c.body}</p>
                <button
                  onClick={() => setReplyTo(c.id)}
                  className="mt-1.5 text-[10px] text-slate-400 hover:text-blue-600"
                >
                  Reply
                </button>
              </div>
            </div>
            {c.replies.map(r => (
              <div key={r.id} className="ml-10 flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                  {r.author.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">{r.author}</span>
                    <span className="text-[10px] text-slate-400">{fmtTs(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Compose */}
        <div className="border-t border-slate-100 pt-3 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Replying to comment #{replyTo}</span>
              <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Your name"
              className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <input
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }}}
              placeholder="Add a comment…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={submit}
              disabled={submitting || !body.trim()}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Credentials ──────────────────────────────────────────────────────────────

function CredentialsSection({ projectId }: { projectId: number }) {
  const [cred, setCred]           = useState<ClientCredential | null>(null);
  const [form, setForm]           = useState<Partial<ClientCredential>>({});
  const [editing, setEditing]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    fetchCredentials(projectId).then(c => { setCred(c); if (c) setForm(c); });
  }, [projectId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await upsertCredentials(projectId, form);
      setCred(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const groups: { title: string; icon: React.ElementType; fields: { key: keyof ClientCredential; label: string; type?: string }[] }[] = [
    { title: "Hosting", icon: Server, fields: [
      { key: "hosting_provider", label: "Provider" }, { key: "hosting_url", label: "URL" },
      { key: "hosting_user", label: "Username" }, { key: "hosting_pass", label: "Password", type: "password" },
    ]},
    { title: "Domain", icon: Globe, fields: [
      { key: "domain_name", label: "Domain" }, { key: "domain_registrar", label: "Registrar" },
      { key: "domain_expiry", label: "Expiry", type: "date" },
    ]},
    { title: "WordPress", icon: Globe, fields: [
      { key: "wp_admin_url", label: "Admin URL" }, { key: "wp_admin_user", label: "Username" },
      { key: "wp_admin_pass", label: "Password", type: "password" },
    ]},
    { title: "FTP / cPanel", icon: Server, fields: [
      { key: "ftp_host", label: "FTP Host" }, { key: "ftp_user", label: "FTP User" },
      { key: "ftp_pass", label: "FTP Password", type: "password" },
      { key: "cpanel_url", label: "cPanel URL" }, { key: "cpanel_user", label: "cPanel User" },
    ]},
    { title: "Google / Analytics", icon: TrendingUp, fields: [
      { key: "ga_property_id", label: "GA Property ID" }, { key: "gsc_property_url", label: "GSC Property" },
      { key: "gbp_url", label: "Google Business Profile" },
      { key: "cloudflare_email", label: "Cloudflare Email" }, { key: "cloudflare_zone", label: "Cloudflare Zone" },
    ]},
    { title: "Social", icon: Globe, fields: [
      { key: "facebook_url", label: "Facebook" }, { key: "instagram_url", label: "Instagram" },
      { key: "linkedin_url", label: "LinkedIn" },
    ]},
  ];

  return (
    <Section
      title="Client Credentials"
      icon={Lock}
      action={
        editing ? (
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={() => { setForm(cred ?? {}); setEditing(true); }} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {groups.map(g => (
          <div key={g.title}>
            <div className="flex items-center gap-2 mb-2">
              <g.icon className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {g.fields.map(f => {
                const val = (cred as Record<string, unknown> | null)?.[f.key] as string | null;
                const formVal = (form as Record<string, unknown>)[f.key] as string ?? "";
                const isPass = f.type === "password";
                return (
                  <div key={f.key}>
                    <p className="text-[10px] text-slate-400 mb-0.5">{f.label}</p>
                    {editing ? (
                      <input
                        type={isPass ? (showPass ? "text" : "password") : f.type ?? "text"}
                        value={formVal}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <p className="text-xs text-slate-700 truncate">
                        {isPass && !showPass && val ? "••••••••" : (val || <span className="text-slate-300">—</span>)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {cred?.other_notes && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Other Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-line">{cred.other_notes}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "deliverables" | "comments" | "credentials" | "financial";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",     label: "Overview" },
  { id: "deliverables", label: "Deliverables" },
  { id: "comments",     label: "Comments" },
  { id: "credentials",  label: "Credentials" },
  { id: "financial",    label: "Financial" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<Partial<ProjectExtended>>({});
  const [saving, setSaving]   = useState(false);

  async function load() {
    setLoading(true);
    try {
      const p = await fetchProjectById(Number(id));
      setProject(p);
      setForm(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!project) return;
    setSaving(true);
    try {
      const updated = await updateProjectExt(project.id, form);
      setProject(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="h-48 rounded-xl bg-slate-100" />
    </div>
  );

  if (!project) return (
    <div className="py-20 text-center">
      <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-slate-300" />
      <p className="text-slate-500">Project not found</p>
      <Link href="/projects" className="mt-2 text-sm text-blue-600 hover:underline">← Back to Projects</Link>
    </div>
  );

  const stageIdx   = STAGES.indexOf(project.status);
  const totalValue = project.total_value ? parseFloat(project.total_value) : 0;
  const paidAmount = project.paid_amount ? parseFloat(project.paid_amount) : 0;
  const deposit    = project.deposit    ? parseFloat(project.deposit)    : 0;
  const outstanding = totalValue - paidAmount;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/projects" className="hover:text-slate-800">Projects</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-800 font-medium truncate">{project.name}</span>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            {editing ? (
              <input value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_COLOR[project.priority] ?? PRIORITY_COLOR.MEDIUM}`}>
                {project.priority}
              </span>
              {project.business_name && (
                <Link href={`/leads/${project.business_id}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
                  <Building2 className="h-3.5 w-3.5" /> {project.business_name}
                </Link>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
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

        {/* Stage progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">Stage</p>
            {editing ? (
              <select value={form.status ?? project.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="text-xs rounded border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400">
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            ) : (
              <span className="text-xs font-semibold text-blue-700">{STAGE_LABELS[project.status] ?? project.status}</span>
            )}
          </div>
          <div className="flex gap-1">
            {STAGES.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= stageIdx ? "bg-blue-500" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Section title="Project Info" icon={User}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: "Developer",       key: "developer" },
                  { label: "Designer",        key: "designer" },
                  { label: "Project Manager", key: "project_manager" },
                  { label: "Package",         key: "package" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    {editing ? (
                      <input value={(form as Record<string, unknown>)[key] as string ?? ""}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    ) : (
                      <p className="mt-0.5 text-sm text-slate-700">{(project as Record<string, unknown>)[key] as string || "—"}</p>
                    )}
                  </div>
                ))}
                <div>
                  <p className="text-xs font-medium text-slate-500">Start Date</p>
                  {editing ? (
                    <input type="date" value={form.start_date ?? ""}
                      onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  ) : <p className="mt-0.5 text-sm text-slate-700">{fmtDate(project.start_date)}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Deadline</p>
                  {editing ? (
                    <input type="date" value={form.expected_delivery ?? ""}
                      onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  ) : <p className="mt-0.5 text-sm text-slate-700">{fmtDate(project.expected_delivery)}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Priority</p>
                  {editing ? (
                    <select value={form.priority ?? project.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                      {["HIGH","MEDIUM","LOW"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  ) : <p className="mt-0.5 text-sm text-slate-700">{project.priority}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Completion</p>
                  {editing ? (
                    <input type="number" min={0} max={100} value={form.completion_pct ?? 0}
                      onChange={e => setForm(f => ({ ...f, completion_pct: Number(e.target.value) }))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  ) : (
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-slate-200">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${project.completion_pct}%` }} />
                      </div>
                      <span className="text-sm">{project.completion_pct}%</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Notes */}
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                {editing ? (
                  <textarea value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-line">{project.notes || "No notes"}</p>
                )}
              </div>
            </Section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Financial</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Project Value</span>
                  <span className="font-semibold text-slate-800">{fmtMoney(project.total_value)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Deposit</span>
                  <span className="text-slate-700">{fmtMoney(project.deposit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Paid</span>
                  <span className="text-green-600 font-medium">{fmtMoney(project.paid_amount)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Outstanding</span>
                  <span className={`font-semibold ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                    {fmtMoney(String(outstanding))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "deliverables" && <DeliverablesSection projectId={project.id} />}
      {tab === "comments"     && <CommentsSection projectId={project.id} />}
      {tab === "credentials"  && <CredentialsSection projectId={project.id} />}

      {tab === "financial" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">Financial Summary</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              { label: "Project Value",   value: fmtMoney(project.total_value),  accent: "bg-blue-100 text-blue-600", icon: DollarSign },
              { label: "Deposit",         value: fmtMoney(project.deposit),       accent: "bg-amber-100 text-amber-600", icon: TrendingUp },
              { label: "Paid",            value: fmtMoney(project.paid_amount),   accent: "bg-green-100 text-green-600", icon: CheckCircle2 },
              { label: "Outstanding",     value: fmtMoney(String(outstanding)),   accent: outstanding > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600", icon: AlertTriangle },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-4 ${s.accent.split(" ")[0]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`h-4 w-4 ${s.accent.split(" ")[1]}`} />
                  <p className="text-xs font-medium text-slate-600">{s.label}</p>
                </div>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>
          {editing && (
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[
                { label: "Project Value", key: "total_value" },
                { label: "Deposit",       key: "deposit" },
                { label: "Paid Amount",   key: "paid_amount" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                  <input type="number" value={(form as Record<string, unknown>)[key] as string ?? ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
