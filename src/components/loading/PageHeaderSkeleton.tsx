import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-64 max-w-full sm:h-12 sm:w-80" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}
