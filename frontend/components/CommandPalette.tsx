"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Users, Target, Kanban, Megaphone, Phone,
  SquareCheckBig, Mail, Zap, RefreshCw, Settings,
  LayoutDashboard, ArrowRight, Building2,
} from "lucide-react";
import { fetchBusinesses, type Business } from "@/lib/api";

// ─── Static nav items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Lead Finder",        href: "/",                icon: Search,        group: "Pages" },
  { label: "CRM Dashboard",      href: "/crm",             icon: LayoutDashboard, group: "Pages" },
  { label: "Leads",              href: "/leads",           icon: Users,         group: "Pages" },
  { label: "Opportunities",      href: "/opportunities",   icon: Target,        group: "Pages" },
  { label: "Pipeline",           href: "/pipeline",        icon: Kanban,        group: "Pages" },
  { label: "Campaigns",          href: "/campaigns",       icon: Megaphone,     group: "Pages" },
  { label: "Call Queue",         href: "/call-list",       icon: Phone,         group: "Pages" },
  { label: "Tasks",              href: "/tasks",           icon: SquareCheckBig,group: "Pages" },
  { label: "Outreach",           href: "/outreach",        icon: Mail,          group: "Pages" },
  { label: "Sales AI",           href: "/sales-intelligence", icon: Zap,        group: "Pages" },
  { label: "Enrichment",         href: "/enrichment",      icon: RefreshCw,     group: "Pages" },
  { label: "Settings",           href: "/settings",        icon: Settings,      group: "Pages" },
  { label: "Activity Timeline",  href: "/activity",        icon: ArrowRight,    group: "Pages" },
];

type Result =
  | { kind: "nav";      label: string; href: string; icon: React.ElementType; group: string }
  | { kind: "business"; id: number;    name: string; city: string | null; category: string | null };

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function fuzzy(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let hi = 0;
  for (let ni = 0; ni < n.length; ni++) {
    hi = h.indexOf(n[ni], hi);
    if (hi === -1) return false;
    hi++;
  }
  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [cursor, setCursor]   = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults(NAV_ITEMS.map(n => ({ kind: "nav", ...n })));
      setCursor(0);
    }
  }, [open]);

  // Search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(NAV_ITEMS.map(n => ({ kind: "nav", ...n })));
      setCursor(0);
      return;
    }
    // Filter nav items
    const navResults: Result[] = NAV_ITEMS
      .filter(n => fuzzy(n.label, q))
      .map(n => ({ kind: "nav", ...n }));

    setResults(navResults);
    setCursor(0);

    // Search businesses
    setLoading(true);
    try {
      const resp = await fetchBusinesses({ search: q, page_size: 8, page: 1 });
      const bizResults: Result[] = (Array.isArray(resp) ? resp : (resp as { items?: Business[] }).items ?? []).map((b: Business) => ({
        kind: "business",
        id: b.id,
        name: b.name,
        city: b.city,
        category: b.category,
      }));
      setResults([...navResults, ...bizResults]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQuery(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 220);
  }

  // Arrow key navigation + Enter
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      selectResult(results[cursor]);
    }
  }

  function selectResult(r: Result) {
    setOpen(false);
    if (r.kind === "nav") router.push(r.href);
    else router.push(`/leads/${r.id}`);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search leads, pages, campaigns…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {loading && (
            <span className="text-xs text-slate-400 animate-pulse">Searching…</span>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No results found</p>
          ) : (
            <>
              {/* Group: Pages */}
              {results.some(r => r.kind === "nav") && (
                <div>
                  <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Pages
                  </p>
                  {results.filter(r => r.kind === "nav").map((r, i) => {
                    const navR = r as Extract<Result, { kind: "nav" }>;
                    const Icon = navR.icon;
                    const idx = results.indexOf(r);
                    return (
                      <button
                        key={navR.href}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => selectResult(r)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          cursor === idx ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          cursor === idx ? "bg-blue-100" : "bg-slate-100"
                        }`}>
                          <Icon className={`h-3.5 w-3.5 ${cursor === idx ? "text-blue-600" : "text-slate-500"}`} />
                        </span>
                        <span className={`text-sm font-medium ${cursor === idx ? "text-blue-700" : "text-slate-700"}`}>
                          {navR.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Group: Businesses */}
              {results.some(r => r.kind === "business") && (
                <div>
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Leads
                  </p>
                  {results.filter(r => r.kind === "business").map((r) => {
                    const bizR = r as Extract<Result, { kind: "business" }>;
                    const idx = results.indexOf(r);
                    return (
                      <button
                        key={bizR.id}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => selectResult(r)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          cursor === idx ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          cursor === idx ? "bg-blue-100" : "bg-slate-100"
                        }`}>
                          <Building2 className={`h-3.5 w-3.5 ${cursor === idx ? "text-blue-600" : "text-slate-400"}`} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${cursor === idx ? "text-blue-700" : "text-slate-800"}`}>
                            {bizR.name}
                          </p>
                          {(bizR.city || bizR.category) && (
                            <p className="text-xs text-slate-400 truncate">
                              {[bizR.category, bizR.city].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${cursor === idx ? "text-blue-400" : "text-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">↵</kbd> open
          </span>
          <span className="ml-auto text-[10px] text-slate-300">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
