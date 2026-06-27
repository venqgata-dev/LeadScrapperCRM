export interface LoadingSkeletonProps {
  rows?: number;
  type?: "list" | "grid" | "table" | "card";
  className?: string;
}

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export function LoadingSkeleton({ rows = 5, type = "list", className = "" }: LoadingSkeletonProps) {
  if (type === "grid") {
    return (
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`space-y-1 ${className}`}>
        <Bone className="h-10" />
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
        <Bone className="mb-3 h-5 w-1/3" />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Bone key={i} className="h-10" />
          ))}
        </div>
      </div>
    );
  }

  // list (default)
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Inline spinner for buttons / small areas */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-current ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/** Full-page loading overlay */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
      <Spinner className="h-8 w-8 mb-3 text-blue-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
