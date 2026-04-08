"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, ChevronDown, Search } from "lucide-react";

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: { value: string; label: string; group?: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  className?: string;
}

export default function MultiSelect({
  label,
  placeholder = "Select...",
  options,
  selected,
  onChange,
  searchable = true,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, typeof options>>((acc, opt) => {
    const group = opt.group || "";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {});

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };

  const getLabel = (value: string) => {
    return options.find((o) => o.value === value)?.label || value;
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div
        className="min-h-[38px] flex flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 cursor-pointer bg-white hover:border-gray-400 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {selected.length === 0 && (
          <span className="text-sm text-gray-400 px-1">{placeholder}</span>
        )}
        {selected.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-medium"
          >
            {getLabel(val)}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(val);
              }}
              className="hover:text-indigo-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <ChevronDown className="h-4 w-4 text-gray-400 ml-auto shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                <Search className="h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  className="flex-1 text-sm outline-none placeholder:text-gray-400"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto max-h-48">
            {Object.entries(grouped).map(([group, opts]) => (
              <div key={group}>
                {group && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                    {group}
                  </div>
                )}
                {opts.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors",
                      selected.includes(opt.value) && "bg-indigo-50 text-indigo-700"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(opt.value);
                    }}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        selected.includes(opt.value)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-300"
                      )}
                    >
                      {selected.includes(opt.value) && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {opt.label}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
