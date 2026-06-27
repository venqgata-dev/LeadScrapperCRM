"use client";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { LoadingSkeleton } from "./loading-state";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  className?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />;
  return dir === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
    : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />;
}

export function DataTable<T>({
  columns, data, rowKey, loading, emptyTitle = "No results",
  emptyDescription, sortKey, sortDir, onSort, onRowClick, stickyHeader, className = "",
}: DataTableProps<T>) {
  if (loading) return <LoadingSkeleton type="table" rows={5} />;

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <table className="min-w-full text-sm">
        <thead className={`border-b border-slate-100 bg-slate-50 ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`px-4 py-3 text-xs font-semibold text-slate-600 ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                } ${col.sortable && onSort ? "cursor-pointer select-none hover:bg-slate-100" : ""}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                  {col.header}
                  {col.sortable && onSort && (
                    <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? sortDir : undefined} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr
              key={rowKey(row)}
              className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-4 py-3 ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                  }`}
                >
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
