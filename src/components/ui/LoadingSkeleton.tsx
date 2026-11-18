import { cn } from "@/src/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}

export function LoadingSkeleton({ variant = "card" }: { variant?: "card" | "line" | "table" }) {
  if (variant === "line") {
    return (
      <div className="space-y-3" role="status" aria-label="Memuat">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="surface rounded-2xl p-5" role="status" aria-label="Memuat data">
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-4" role="status" aria-label="Memuat">
      <Skeleton className="mb-4 aspect-[16/10] w-full rounded-2xl" />
      <Skeleton className="mb-2 h-5 w-2/3" />
      <Skeleton className="mb-4 h-3 w-1/2" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function SetupGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <LoadingSkeleton key={index} />
      ))}
    </div>
  );
}
