"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-xs font-medium text-[#86868b] dark:text-[#8e8e93]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "block w-full rounded-xl border border-black/10 dark:border-white/10",
            "bg-white px-3 py-2 text-sm text-[#1d1d1f] dark:bg-[#1c1c1e] dark:text-white",
            "placeholder:text-[#86868b] dark:placeholder:text-[#636366]",
            "nb-input-focus transition-shadow",
            error && "border-red-400",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
