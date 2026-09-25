import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GradesLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Skeleton className="h-14 w-full" />

      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`grades-filter-${index}`} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="grid grid-cols-7 gap-3 border-b pb-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={`grades-head-${index}`} className="h-8 w-full" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, row) => (
            <div key={`grades-row-${row}`} className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, column) => (
                <Skeleton
                  key={`grades-cell-${row}-${column}`}
                  className="h-8 w-full"
                />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
