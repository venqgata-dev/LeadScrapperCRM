import { Search } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon: Icon = Search, title, description, action, className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-14 px-6 text-center ${className}`}>
      <div className="mb-3 rounded-2xl bg-slate-100 p-4">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
