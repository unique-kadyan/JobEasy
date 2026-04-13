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
          <label className="mb-1.5 block text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "block w-full rounded-xl border border-black/10 dark:border-white/10",
            "bg-white px-3 py-2 text-sm text-[#1d1d1f] dark:bg-[#1c1c1e] dark:text-white",
            "nb-input-focus cursor-pointer appearance-none",
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
