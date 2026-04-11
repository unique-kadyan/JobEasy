import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border border-black dark:border-white px-2 py-0.5 text-xs font-bold",
        className
      )}
    >
      {children}
    </span>
  );
}
