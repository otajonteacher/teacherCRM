import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Server-render qilinadigan neytral yuklanish placeholder'i.
 * Ichiga foydalanuvchi ma'lumoti kiritilmaydi — faqat layout shakli.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
