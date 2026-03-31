import type { ReactNode } from "react";
import { cn } from "@/lib/dashboard/utils";

type BadgeVariant = "good" | "warning" | "replace" | "critical" | "info";

const styles: Record<BadgeVariant, string> = {
  good: "border-[var(--color-lime)]/35 bg-[var(--color-lime)]/12 text-[var(--color-lime)]",
  warning: "border-[var(--color-teal)]/35 bg-[var(--color-teal)]/12 text-[var(--color-teal)]",
  replace: "border-[var(--color-purple)]/35 bg-[var(--color-purple)]/12 text-[var(--color-purple)]",
  critical: "border-rose-400/35 bg-rose-400/12 text-rose-300",
  info: "border-white/10 bg-white/6 text-white/70"
};

export function Badge({
  children,
  variant = "info",
  className
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", styles[variant], className)}>
      {children}
    </span>
  );
}
