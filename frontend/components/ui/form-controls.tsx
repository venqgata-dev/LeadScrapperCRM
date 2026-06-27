"use client";

// ─── TextInput ────────────────────────────────────────────────────────────────

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputClassName?: string;
}

export function TextInput({ label, error, hint, className = "", inputClassName = "", ...props }: TextInputProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <input
        {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
        } ${inputClassName}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", ...props }: TextareaProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <textarea
        {...props}
        className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, className = "", children, ...props }: SelectProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <select
        {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
        }`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ label, checked, onChange, hint, disabled, className = "" }: CheckboxProps) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-blue-600 rounded"
      />
      <div>
        <span className="text-sm text-slate-700">{label}</span>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </label>
  );
}

// ─── MoneyInput ───────────────────────────────────────────────────────────────

export interface MoneyInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function MoneyInput({
  label, value, onChange, currency = "€", placeholder = "0.00", error, className = "",
}: MoneyInputProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{currency}</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
          }`}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
