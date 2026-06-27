import { Search, X } from "lucide-react";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export function SearchBar({
  value, onChange, onClear, placeholder = "Search…", className = "", size = "md",
}: SearchBarProps) {
  const padding = size === "sm" ? "px-3 py-2 pl-8 text-xs" : "px-3 py-2.5 pl-9 text-sm";
  const iconSize = size === "sm" ? "h-3.5 w-3.5 left-2.5" : "h-4 w-4 left-3";

  return (
    <div className={`relative ${className}`}>
      <Search className={`absolute top-1/2 -translate-y-1/2 ${iconSize} text-slate-400 pointer-events-none`} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-200 bg-white ${padding} pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
      />
      {value && (
        <button
          onClick={() => { onChange(""); onClear?.(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
