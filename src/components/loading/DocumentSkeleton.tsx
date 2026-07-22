import { Skeleton } from "@/components/ui/skeleton";

export function DocumentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-sm border border-border bg-white shadow-sm">
      <div className="space-y-3 bg-[var(--brand-navy,#0b1f3a)] px-6 py-8 sm:px-8">
        <Skeleton className="h-16 w-24 bg-white/20" />
        <Skeleton className="h-3 w-48 bg-white/15" />
        <Skeleton className="h-3 w-36 bg-white/15" />
        <Skeleton className="h-3 w-40 bg-white/15" />
      </div>
      <div className="space-y-5 px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-24 w-full sm:w-40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
