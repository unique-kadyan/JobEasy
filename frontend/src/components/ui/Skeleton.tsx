import MuiSkeleton from "@mui/material/Skeleton";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "rounded" | "circular";
}

export function Skeleton({ className, variant = "rounded" }: SkeletonProps) {
  return (
    <MuiSkeleton
      variant={variant}
      animation="wave"
      className={cn("bg-gray-200 dark:bg-gray-700", className)}
      sx={{ bgcolor: "transparent" }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#161b22]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <MuiSkeleton variant="rounded" animation="wave" width="75%" height={20} />
          <MuiSkeleton variant="rounded" animation="wave" width="50%" height={16} />
          <MuiSkeleton variant="rounded" animation="wave" width="100%" height={12} />
          <MuiSkeleton variant="rounded" animation="wave" width="83%" height={12} />
        </div>
        <div className="shrink-0 space-y-2">
          <MuiSkeleton variant="rounded" animation="wave" width={96} height={32} />
          <MuiSkeleton variant="rounded" animation="wave" width={96} height={32} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-[#161b22]">
      <MuiSkeleton variant="rounded" animation="wave" width={40} height={40} />
      <div className="space-y-2">
        <MuiSkeleton variant="rounded" animation="wave" width={64} height={28} />
        <MuiSkeleton variant="rounded" animation="wave" width={96} height={12} />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 space-y-1.5">
        <MuiSkeleton variant="rounded" animation="wave" width="66%" height={16} />
        <MuiSkeleton variant="rounded" animation="wave" width="33%" height={12} />
      </div>
      <MuiSkeleton
        variant="rounded"
        animation="wave"
        width={80}
        height={24}
        sx={{ borderRadius: 9999 }}
      />
    </div>
  );
}
