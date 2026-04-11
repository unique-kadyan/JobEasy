"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-[4px] font-bold tracking-tight transition-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:pointer-events-none";

    const variants: Record<string, string> = {
      primary:
        "bg-indigo-600 text-white border-2 border-black dark:border-white nb-shadow nb-lift",
      secondary:
        "bg-amber-400 text-black border-2 border-black dark:border-white nb-shadow nb-lift",
      outline:
        "bg-white dark:bg-[#1a1a1a] text-black dark:text-white border-2 border-black dark:border-white nb-shadow nb-lift",
      ghost:
        "text-gray-600 dark:text-[#c9d1d9] hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-[4px]",
      danger:
        "bg-red-500 text-white border-2 border-black dark:border-white nb-shadow nb-lift",
    };

    const sizes: Record<string, string> = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-2.5 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
