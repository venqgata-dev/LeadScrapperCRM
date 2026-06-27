"use client";
import { useState } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

export interface ErrorCardProps {
  message: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorCard({ message, detail, onRetry, className = "" }: ErrorCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{message}</p>
          {detail && (
            <button
              onClick={() => setExpanded(x => !x)}
              className="mt-1 flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
          {expanded && detail && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-red-100 p-2 text-[10px] text-red-700 whitespace-pre-wrap break-all">
              {detail}
            </pre>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
