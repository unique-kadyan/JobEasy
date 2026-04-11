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
          <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "block w-full rounded-[4px] border-2 border-black dark:border-white",
            "bg-white dark:bg-[#0d1117] px-3 py-2 text-sm font-medium text-black dark:text-white",
            "placeholder:text-gray-400 dark:placeholder:text-[#6e7681]",
            "nb-input-focus transition-shadow",
            error && "border-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
