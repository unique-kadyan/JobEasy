"use client";

import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "block w-full rounded-[4px] border-2 border-black dark:border-[#30363d] bg-white dark:bg-[#0d1117] px-3 py-2 text-black dark:text-white text-sm font-medium nb-input-focus appearance-none cursor-pointer",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
