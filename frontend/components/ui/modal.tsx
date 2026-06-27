"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const SIZE_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw]",
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: keyof typeof SIZE_MAP;
  children: React.ReactNode;
  /** If true, clicking the backdrop closes the modal. Default: true */
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Modal({
  open, onClose, title, size = "md", children, closeOnBackdrop = true, className = "",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className={`w-full ${SIZE_MAP[size]} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ${className}`}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
