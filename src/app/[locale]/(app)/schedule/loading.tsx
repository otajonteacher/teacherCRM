import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={`schedule-head-${index}`} className="h-6 w-full" />
            ))}
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={`schedule-cell-${index}`} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
