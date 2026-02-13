import { Skeleton } from "@/components/ui/skeleton";

export default function TablesLoading() {
  return (
    <div className="bg-neutral-50 min-h-screen pt-15 p-4">
      <div className="space-y-4">
        {/* Sector tabs skeleton */}
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {/* Floor plan skeleton */}
        <Skeleton className="h-150 w-full rounded-lg" />
      </div>
    </div>
  );
}
