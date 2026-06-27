export type BadgeVariant =
  | "default" | "slate" | "blue" | "green" | "red" | "amber" | "orange"
  | "purple" | "emerald" | "indigo" | "cyan";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  "bg-slate-100 text-slate-700",
  slate:    "bg-slate-100 text-slate-600",
  blue:     "bg-blue-100 text-blue-700",
  green:    "bg-green-100 text-green-700",
  red:      "bg-red-100 text-red-700",
  amber:    "bg-amber-100 text-amber-700",
  orange:   "bg-orange-100 text-orange-700",
  purple:   "bg-purple-100 text-purple-700",
  emerald:  "bg-emerald-100 text-emerald-700",
  indigo:   "bg-indigo-100 text-indigo-700",
  cyan:     "bg-cyan-100 text-cyan-700",
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "default", dot, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/** Pill-style status badge with optional pulse for active states */
export function StatusDot({
  color, pulse, className = "",
}: { color: string; pulse?: boolean; className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-50`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}
