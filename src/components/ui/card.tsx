import type { PropsWithChildren } from "react";
import { cn } from "@/lib/dashboard/utils";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ className, children }: CardProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-3xl border border-white/8 bg-[var(--panel)]/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}
