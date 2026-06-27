"use client";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

const COLOR_MAP = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   icon: "bg-blue-100 text-blue-600" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  icon: "bg-green-100 text-green-600" },
  red:    { bg: "bg-red-50",    text: "text-red-700",    icon: "bg-red-100 text-red-600" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  icon: "bg-amber-100 text-amber-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "bg-purple-100 text-purple-600" },
  emerald:{ bg: "bg-emerald-50",text: "text-emerald-700",icon: "bg-emerald-100 text-emerald-600" },
  slate:  { bg: "bg-slate-50",  text: "text-slate-700",  icon: "bg-slate-100 text-slate-600" },
} as const;

export type StatCardColor = keyof typeof COLOR_MAP;

export interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  icon?: React.ElementType;
  trend?: number;
  color?: StatCardColor;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label, value, subLabel, icon: Icon, trend, color = "slate", href, onClick, className = "",
}: StatCardProps) {
  const c = COLOR_MAP[color];

  const inner = (
    <div className={`group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between">
        {Icon && (
          <div className={`rounded-xl p-2 ${c.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        {(href || onClick) && (
          <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      {(subLabel || trend != null) && (
        <div className="mt-1 flex items-center gap-1">
          {trend != null && trend !== 0 && (
            trend > 0
              ? <TrendingUp className="h-3 w-3 text-green-500" />
              : <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          {subLabel && <p className="text-[10px] text-slate-400">{subLabel}</p>}
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="text-left w-full">{inner}</button>;
  return inner;
}

/** Compact KPI tile — no icon, no hover arrow. Use inside dashboard strips. */
export function KpiTile({
  label, value, subLabel, color = "slate", className = "",
}: Pick<StatCardProps, "label" | "value" | "subLabel" | "color" | "className">) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border p-3.5 ${c.bg} ${className}`}>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className={`text-xs font-medium ${c.text}`}>{label}</p>
      {subLabel && <p className="mt-0.5 text-[10px] text-slate-500">{subLabel}</p>}
    </div>
  );
}
