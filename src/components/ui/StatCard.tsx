import { cn } from "@/src/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "violet",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "violet" | "cyan" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  const accents = {
    violet: "text-violet bg-violet/12 border-violet/20",
    cyan: "text-cyan bg-cyan/10 border-cyan/20",
    emerald: "text-emerald-300 bg-emerald-300/10 border-emerald-300/20",
    amber: "text-amber-300 bg-amber-300/10 border-amber-300/20",
    rose: "text-rose-300 bg-rose-300/10 border-rose-300/20",
  } as const;

  return (
    <div className={cn("glass-subtle rounded-2xl p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.1em] text-muted">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl border [&>svg]:h-4 [&>svg]:w-4",
              accents[accent],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
