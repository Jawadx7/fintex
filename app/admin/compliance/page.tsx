import { Suspense } from "react";

import AlertsDashboard from "@/app/components/admin/compliance/alerts-dashboard";
import { Skeleton } from "@/app/components/ui/skeleton";

export const dynamic = "force-dynamic";

function DashboardFallback() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <AlertsDashboard />
    </Suspense>
  );
}
