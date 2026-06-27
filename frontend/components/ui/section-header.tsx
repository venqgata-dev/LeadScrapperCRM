export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}

export function SectionHeader({ title, description, actions, icon: Icon, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-slate-500" />}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 leading-tight truncate">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Smaller variant for card headers */
export function CardHeader({ title, actions, icon: Icon, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
