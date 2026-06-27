"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Kanban, Plus, Building2, User, Calendar, Clock,
  AlertTriangle, CheckCircle2, RefreshCw, ChevronRight,
} from "lucide-react";
import { fetchAllProjects, fetchProjectStats, updateProjectExt, type ProjectExtended } from "@/lib/api";

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { id: string; label: string; color: string; bg: string; border: string }[] = [
  { id: "PLANNING",           label: "Planning",          color: "text-slate-600",  bg: "bg-slate-50",   border: "border-slate-200" },
  { id: "CONTENT_COLLECTION", label: "Content",           color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200" },
  { id: "DESIGN",             label: "Design",            color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  { id: "DEVELOPMENT",        label: "Development",       color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  { id: "CLIENT_REVIEW",      label: "Client Review",     color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200" },
  { id: "SEO",                label: "SEO",               color: "text-cyan-700",   bg: "bg-cyan-50",    border: "border-cyan-200" },
  { id: "TESTING",            label: "Testing",           color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200" },
  { id: "DEPLOYMENT",         label: "Deployment",        color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
  { id: "COMPLETED",          label: "Completed",         color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200" },
];

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:   "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW:    "bg-slate-100 text-slate-600",
};

function isOverdue(p: ProjectExtended) {
  if (!p.expected_delivery || p.status === "COMPLETED") return false;
  return new Date(p.expected_delivery) < new Date();
}

function fmtDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  project,
  onDragStart,
}: {
  project: ProjectExtended;
  onDragStart: (e: React.DragEvent, id: number) => void;
}) {
  const overdue = isOverdue(project);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, project.id)}
      className="cursor-grab active:cursor-grabbing rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-semibold text-slate-800 hover:text-blue-600 line-clamp-2 leading-snug"
          onClick={e => e.stopPropagation()}
        >
          {project.name}
        </Link>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLOR[project.priority] ?? PRIORITY_COLOR.MEDIUM}`}>
          {project.priority}
        </span>
      </div>

      {project.business_name && (
        <div className="flex items-center gap-1 mb-2">
          <Building2 className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-500 truncate">{project.business_name}</span>
        </div>
      )}

      {/* Progress bar */}
      {project.completion_pct > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-slate-400">Progress</span>
            <span className="text-[10px] text-slate-500 font-medium">{project.completion_pct}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-200">
            <div
              className="h-1 rounded-full bg-blue-500 transition-all"
              style={{ width: `${project.completion_pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {project.developer && (
            <div className="flex items-center gap-1">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                {project.developer.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
        {project.expected_delivery && (
          <div className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? "text-red-600" : "text-slate-400"}`}>
            {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {fmtDate(project.expected_delivery)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  stage,
  projects,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  stage: (typeof STAGES)[0];
  projects: ProjectExtended[];
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  isDragOver: boolean;
}) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className={`flex items-center justify-between rounded-t-xl border ${stage.border} ${stage.bg} px-3 py-2`}>
        <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${stage.bg} ${stage.color} border ${stage.border}`}>
          {projects.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 rounded-b-xl border-x border-b p-2 space-y-2 min-h-[120px] transition-colors ${stage.border} ${
          isDragOver ? "bg-blue-50" : "bg-slate-50/60"
        }`}
        onDragOver={e => onDragOver(e, stage.id)}
        onDrop={e => onDrop(e, stage.id)}
      >
        {projects.map(p => (
          <KanbanCard key={p.id} project={p} onDragStart={onDragStart} />
        ))}
        {projects.length === 0 && (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-300">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsKanbanPage() {
  const [projects, setProjects]         = useState<ProjectExtended[]>([]);
  const [stats, setStats]               = useState<{ total: number; in_progress: number; overdue: number; completed: number } | null>(null);
  const [loading, setLoading]           = useState(true);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const dragId = useRef<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([fetchAllProjects(), fetchProjectStats()]);
      setProjects(p);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleDragStart(e: React.DragEvent, id: number) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  }

  async function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    setDragOverStage(null);
    const id = dragId.current;
    if (!id) return;
    const project = projects.find(p => p.id === id);
    if (!project || project.status === stageId) return;

    // Optimistic update
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: stageId } : p));
    try {
      await updateProjectExt(id, { status: stageId });
    } catch {
      // Revert on error
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: project.status } : p));
    }
  }

  const byStage = (stageId: string) => projects.filter(p => p.status === stageId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Website Projects</h1>
          <p className="mt-0.5 text-sm text-slate-500">Drag cards between stages to move projects</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <Link href="/leads" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" /> New Project
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{stats.total}</p>
            <p className="text-[10px] text-slate-500">Total</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{stats.in_progress}</p>
            <p className="text-[10px] text-slate-500">In Progress</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{stats.overdue}</p>
            <p className="text-[10px] text-slate-500">Overdue</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
            <p className="text-[10px] text-slate-500">Completed</p>
          </div>
        </div>
      )}

      {/* Kanban board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.slice(0, 5).map(s => (
            <div key={s.id} className="w-64 shrink-0 space-y-2">
              <div className="h-9 animate-pulse rounded-t-xl bg-slate-200" />
              <div className="h-28 animate-pulse rounded-b-xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          onDragLeave={() => setDragOverStage(null)}
        >
          {STAGES.map(stage => (
            <Column
              key={stage.id}
              stage={stage}
              projects={byStage(stage.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragOver={dragOverStage === stage.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
