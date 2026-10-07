"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { cn } from "@/lib/utils";

import type { TransactionRow } from "@/lib/finance";

const TransactionsSection = ({ rows }: { rows: TransactionRow[] }) => {
  return (
    <div className="mb-3">
      <h1>Recent Transactions</h1>
      <div className="relative w-full overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table aria-label="Recent transactions">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-center">ID</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Amount($)</TableHead>
              <TableHead className="text-center">Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Charges($)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-center">{row.reference}</TableCell>
                <TableCell className="text-center">{row.type}</TableCell>
                <TableCell className="text-center">{row.amount}</TableCell>
                <TableCell className="text-center">{row.date}</TableCell>
                <TableCell className="text-center">
                  <small
                    className={cn(
                      "rounded-md p-2",
                      row.status === "success" && "bg-primary_fade text-white",
                      row.status === "pending" && "bg-gold_fade text-primary",
                      row.status === "failed" && "text-red-500"
                    )}
                  >
                    {row.status}
                  </small>
                </TableCell>
                <TableCell className="text-center">{row.charges}</TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
export default TransactionsSection;