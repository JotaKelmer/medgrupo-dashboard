import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/dashboard/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-white/4 px-3 text-sm text-white outline-none ring-0 transition placeholder:text-white/35 focus:border-[var(--color-lime)]/50 focus:bg-white/6",
        className
      )}
      {...props}
    />
  );
}
