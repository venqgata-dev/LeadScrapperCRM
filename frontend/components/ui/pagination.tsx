"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPage, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageRange(page, totalPages);

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <NavBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </NavBtn>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`min-w-[32px] rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
              p === page
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p}
          </button>
        )
      )}

      <NavBtn disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </NavBtn>
    </div>
  );
}

function NavBtn({
  children, disabled, onClick,
}: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 transition-colors"
    >
      {children}
    </button>
  );
}

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | "…")[] = [1];
  if (current > 3) result.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) result.push(p);
  if (current < total - 2) result.push("…");
  result.push(total);
  return result;
}

/** Summary line: "Showing 1–25 of 142" */
export function PageSummary({
  page, pageSize, total, className = "",
}: { page: number; pageSize: number; total: number; className?: string }) {
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);
  return (
    <p className={`text-xs text-slate-500 ${className}`}>
      Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{" "}
      <span className="font-medium text-slate-700">{total.toLocaleString()}</span>
    </p>
  );
}
