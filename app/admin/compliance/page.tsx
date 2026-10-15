import { ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function CompliancePage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Compliance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and action compliance cases for this workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No cases yet</CardTitle>
          <CardDescription>
            Compliance cases will appear here once reviews are available. This
            environment uses synthetic demo data only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-8 w-8" />
            <p className="text-sm">Nothing to review right now.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
