"use client";

import { useEffect, useState } from "react";
import {
  fetchPlaybooks,
  createPlaybook,
  updatePlaybook,
  deletePlaybook,
  type SalesPlaybook,
  type PlaybookCreate,
} from "@/lib/api";
import {
  LoadingSkeleton, ErrorCard, EmptyState, Modal, ConfirmDialog, SectionHeader,
  TextInput, Textarea, Checkbox, Badge,
} from "@/components/ui";
import { BookOpen, Plus, ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";

const EMPTY_FORM: PlaybookCreate = {
  name: "",
  description: "",
  applies_to: [],
  opening: "",
  questions: [],
  pain_points: [],
  closing: "",
  objection_handling: {},
  is_active: true,
};

function playbookToForm(pb: SalesPlaybook): PlaybookCreate {
  return {
    name: pb.name,
    description: pb.description ?? "",
    applies_to: pb.applies_to,
    opening: pb.opening ?? "",
    questions: pb.questions,
    pain_points: pb.pain_points,
    closing: pb.closing ?? "",
    objection_handling: pb.objection_handling,
    is_active: pb.is_active,
  };
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<SalesPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalesPlaybook | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesPlaybook | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState<PlaybookCreate>(EMPTY_FORM);
  const [questionsRaw, setQuestionsRaw] = useState("");
  const [painRaw, setPainRaw] = useState("");
  const [appliesToRaw, setAppliesToRaw] = useState("");
  const [objRaw, setObjRaw] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPlaybooks(await fetchPlaybooks(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load playbooks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setQuestionsRaw("");
    setPainRaw("");
    setAppliesToRaw("");
    setObjRaw("");
    setShowModal(true);
  }

  function openEdit(pb: SalesPlaybook) {
    setEditing(pb);
    const f = playbookToForm(pb);
    setForm(f);
    setQuestionsRaw(pb.questions.join("\n"));
    setPainRaw(pb.pain_points.join("\n"));
    setAppliesToRaw(pb.applies_to.join(", "));
    setObjRaw(
      Object.entries(pb.objection_handling)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    );
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: PlaybookCreate = {
        ...form,
        applies_to: appliesToRaw.split(",").map((s) => s.trim()).filter(Boolean),
        questions: questionsRaw.split("\n").map((s) => s.trim()).filter(Boolean),
        pain_points: painRaw.split("\n").map((s) => s.trim()).filter(Boolean),
        objection_handling: Object.fromEntries(
          objRaw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((line) => {
              const idx = line.indexOf(":");
              return idx > -1 ? [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] : [line, ""];
            })
        ),
      };
      if (editing) {
        await updatePlaybook(editing.id, payload);
      } else {
        await createPlaybook(payload);
      }
      setShowModal(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlaybook(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <LoadingSkeleton type="list" rows={6} />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sales Playbooks"
        description="Reusable scripts for different business types"
        icon={BookOpen}
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Playbook
          </button>
        }
      />

      {playbooks.length === 0 ? (
        <EmptyState icon={BookOpen} title="No playbooks yet" description="Create your first sales playbook." action={{ label: "New Playbook", onClick: openCreate }} />
      ) : (
        <div className="space-y-3">
          {playbooks.map((pb) => {
            const isOpen = expanded.has(pb.id);
            return (
              <div key={pb.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(pb.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{pb.name}</span>
                      {pb.is_default && <Badge variant="blue">Default</Badge>}
                      {!pb.is_active && <Badge variant="slate">Inactive</Badge>}
                    </div>
                    {pb.description && <p className="text-sm text-slate-500 mt-0.5">{pb.description}</p>}
                    {pb.applies_to.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pb.applies_to.map((t) => <Badge key={t} variant="default">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(pb); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!pb.is_default && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(pb); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50">
                    {pb.opening && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Opening</p>
                        <p className="text-sm text-slate-700">{pb.opening}</p>
                      </div>
                    )}
                    {pb.questions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Discovery Questions</p>
                        <ul className="space-y-1">
                          {pb.questions.map((q, i) => <li key={i} className="text-sm text-slate-700">• {q}</li>)}
                        </ul>
                      </div>
                    )}
                    {pb.pain_points.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pain Points to Highlight</p>
                        <ul className="space-y-1">
                          {pb.pain_points.map((p, i) => <li key={i} className="text-sm text-slate-700">• {p}</li>)}
                        </ul>
                      </div>
                    )}
                    {pb.closing && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Closing</p>
                        <p className="text-sm text-slate-700">{pb.closing}</p>
                      </div>
                    )}
                    {Object.keys(pb.objection_handling).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Objection Handling</p>
                        <div className="space-y-2">
                          {Object.entries(pb.objection_handling).map(([obj, resp]) => (
                            <div key={obj} className="bg-white border border-slate-200 rounded-lg p-3">
                              <p className="text-xs font-medium text-slate-900">"{obj}"</p>
                              <p className="text-xs text-slate-600 mt-1">{resp}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Playbook" : "New Playbook"} size="xl">
        <div className="space-y-4">
          <TextInput label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextInput label="Description" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <TextInput label="Applies To (comma-separated)" value={appliesToRaw} onChange={(e) => setAppliesToRaw(e.target.value)} placeholder="Plumbers, Electricians, Restaurants" />
          <Textarea label="Opening Line" value={form.opening ?? ""} onChange={(e) => setForm((f) => ({ ...f, opening: e.target.value }))} rows={2} />
          <Textarea label="Discovery Questions (one per line)" value={questionsRaw} onChange={(e) => setQuestionsRaw(e.target.value)} rows={4} />
          <Textarea label="Pain Points (one per line)" value={painRaw} onChange={(e) => setPainRaw(e.target.value)} rows={3} />
          <Textarea label="Closing" value={form.closing ?? ""} onChange={(e) => setForm((f) => ({ ...f, closing: e.target.value }))} rows={2} />
          <Textarea
            label={'Objection Handling (format: "Objection: Response", one per line)'}
            value={objRaw}
            onChange={(e) => setObjRaw(e.target.value)}
            rows={4}
            placeholder={"Too expensive: We offer a payment plan...\nNot interested: I understand, when would be a better time?"}
          />
          <Checkbox label="Active" checked={form.is_active ?? true} onChange={(v) => setForm((f) => ({ ...f, is_active: v })) } />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Playbook"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Playbook"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
