import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/dashboard/utils";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-2xl border border-[var(--color-lime)]/30 bg-[var(--color-lime)] px-4 text-sm font-semibold text-[var(--color-bg)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
