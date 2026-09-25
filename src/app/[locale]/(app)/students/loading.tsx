import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentsLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`students-filter-${index}`} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="grid grid-cols-4 gap-4 border-b pb-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`students-head-${index}`} className="h-5 w-full" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, row) => (
            <div key={`students-row-${row}`} className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, column) => (
                <Skeleton
                  key={`students-cell-${row}-${column}`}
                  className="h-5 w-full"
                />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
