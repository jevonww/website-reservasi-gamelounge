import { SetupGridSkeleton, Skeleton } from "@/src/components/ui/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="container-wide pb-10">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="glass mt-8 rounded-3xl p-5">
        <Skeleton className="h-11 w-full" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="mt-8">
        <SetupGridSkeleton count={6} />
      </div>
    </div>
  );
}
