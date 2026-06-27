"use client";
import { Modal } from "./modal";
import { Spinner } from "./loading-state";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = "Confirm", cancelLabel = "Cancel",
  variant = "default", loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <Modal open={open} onClose={onClose} size="sm" closeOnBackdrop={!loading}>
      <div className="flex gap-3">
        {isDanger && (
          <div className="shrink-0 rounded-xl bg-red-100 p-2.5">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => onConfirm()}
          disabled={loading}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            isDanger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading && <Spinner className="h-3.5 w-3.5" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
