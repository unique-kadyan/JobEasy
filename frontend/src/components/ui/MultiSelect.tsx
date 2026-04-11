"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, ChevronDown, Search } from "@/components/ui/icons";

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
        <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div
        className="min-h-[38px] flex flex-wrap items-center gap-1 rounded-[4px] border-2 border-black dark:border-[#30363d] px-2 py-1.5 cursor-pointer bg-white dark:bg-[#0d1117] hover:border-indigo-600 dark:hover:border-indigo-500 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {selected.length === 0 && (
          <span className="text-sm font-medium text-gray-400 dark:text-[#8b949e] px-1">{placeholder}</span>
        )}
        {selected.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 rounded-[3px] border border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 text-xs font-black uppercase tracking-wide"
          >
            {getLabel(val)}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(val);
              }}
              className="hover:text-indigo-900 dark:hover:text-indigo-200"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-[#8b949e] ml-auto shrink-0" />
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-[4px] border-2 border-black dark:border-[#30363d] bg-white dark:bg-[#161b22] max-h-64 overflow-hidden"
          style={{ boxShadow: "4px 4px 0 #000" }}
        >
          {searchable && (
            <div className="p-2 border-b-2 border-black dark:border-[#30363d]">
              <div className="flex items-center gap-2 rounded-[3px] border-2 border-black dark:border-[#30363d] bg-gray-50 dark:bg-[#0d1117] px-2 py-1.5">
                <Search className="h-3.5 w-3.5 text-gray-400 dark:text-[#8b949e]" />
                <input
                  type="text"
                  className="flex-1 text-sm font-medium outline-none bg-transparent text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#8b949e]"
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
                  <div className="px-3 py-1.5 text-[10px] font-black text-gray-400 dark:text-[#8b949e] uppercase tracking-widest bg-gray-50 dark:bg-[#0d1117] border-b border-gray-100 dark:border-[#21262d]">
                    {group}
                  </div>
                )}
                {opts.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#21262d] flex items-center gap-2 transition-colors text-black dark:text-white",
                      selected.includes(opt.value) && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(opt.value);
                    }}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-[2px] border-2 flex items-center justify-center shrink-0",
                        selected.includes(opt.value)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-black dark:border-[#30363d]"
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
              <p className="text-xs font-bold text-gray-400 dark:text-[#8b949e] text-center py-3 uppercase tracking-wide">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
