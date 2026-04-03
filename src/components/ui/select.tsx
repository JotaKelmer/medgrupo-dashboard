import { cn } from "@/lib/dashboard/utils";

type SelectProps = {
  className?: string;
  children?: any;
} & Record<string, any>;

export function Select({
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-white/4 px-3 text-sm text-white outline-none ring-0 transition focus:border-[var(--color-lime)]/50 focus:bg-white/6",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}