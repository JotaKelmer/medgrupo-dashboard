import type { ReactNode } from "react";
import { cn } from "@/lib/dashboard/utils";

type BadgeVariant = "good" | "warning" | "replace" | "critical" | "info";

const styles: Record<BadgeVariant, string> = {
  good: "border-emerald-400/35 bg-emerald-500/12 text-emerald-300",
  warning: "border-amber-400/40 bg-amber-400/12 text-amber-200",
  replace: "border-red-400/35 bg-red-500/12 text-red-300",
  critical: "border-red-400/35 bg-red-500/12 text-red-300",
  info: "border-white/10 bg-white/6 text-white/70",
};

export function Badge({
  children,
  variant = "info",
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
