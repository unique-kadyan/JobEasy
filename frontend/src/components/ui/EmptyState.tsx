"use client";

import { LucideIcon } from "@/components/ui/icons";
import Button from "@/components/ui/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-black dark:border-[#30363d] bg-indigo-50 dark:bg-indigo-900/20 mb-4"
        style={{ boxShadow: "3px 3px 0 #000" }}
      >
        <Icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h3 className="text-base font-black text-black dark:text-white uppercase tracking-tight mb-1">{title}</h3>
      <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e] max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
