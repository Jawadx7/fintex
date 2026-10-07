"use client";
import { useState, useMemo } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Delete, Filter } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { TransactionRow } from "@/lib/finance";

type TransactionsTableProps = {
  rows: TransactionRow[];
};

type SortableKey =
  | "name"
  | "reference"
  | "type"
  | "amount"
  | "date"
  | "status"
  | "charges";

type Comparator = (a: TransactionRow, b: TransactionRow) => number;

function descendingComparator(
  a: TransactionRow,
  b: TransactionRow,
  orderBy: SortableKey
) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order: "asc" | "desc", orderBy: SortableKey): Comparator {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array: TransactionRow[], comparator: Comparator) {
  const stabilizedThis = array.map((el, index) => [el, index] as const);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells: Array<{
  id: SortableKey;
  numeric: boolean;
  label: string;
}> = [
  { id: "name", numeric: false, label: "Client" },
  { id: "reference", numeric: true, label: "ID" },
  { id: "type", numeric: true, label: "Type" },
  { id: "amount", numeric: true, label: "Amount" },
  { id: "date", numeric: true, label: "Date" },
  { id: "status", numeric: true, label: "Status" },
  { id: "charges", numeric: true, label: "Charges" },
];

function SortButton({
  active,
  direction,
  onClick,
  children,
}: {
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="-ml-3 h-8 gap-1 px-2 hover:bg-muted"
    >
      {children}
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {/* Replaces MUI's visuallyHidden helper */}
      <span className="sr-only">
        {active
          ? direction === "desc"
            ? "sorted descending"
            : "sorted ascending"
          : "not sorted"}
      </span>
    </Button>
  );
}

function TransactionsToolbar({ numSelected }: { numSelected: number }) {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between gap-4 px-4",
        numSelected > 0 && "bg-primary/10"
      )}
    >
      {numSelected > 0 ? (
        <p className="text-sm font-medium">{numSelected} selected</p>
      ) : (
        <h6 id="tableTitle" className="text-base font-semibold">
          Transactions
        </h6>
      )}

      <TooltipProvider delayDuration={200}>
        {numSelected > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete selected">
                <Delete className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Filter list">
                <Filter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Filter list</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}

export default function TransactionsTable({ rows }: TransactionsTableProps) {
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [orderBy, setOrderBy] = useState<SortableKey>("reference");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  const handleRequestSort = (property: SortableKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (checked: boolean) => {
    setSelected(checked ? rows.map((n) => n.id) : []);
  };

  const handleClick = (_event: React.MouseEvent<HTMLTableRowElement>, id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : current.concat(id)
    );
  };

  const isSelected = (id: string) => selected.includes(id);
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const someSelected = selected.length > 0 && !allSelected;

  const sortedRows = useMemo(
    () => stableSort(rows, getComparator(order, orderBy)),
    [order, orderBy, rows]
  );

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  // Clamp so deleting/resizing can never leave the pager on a dead page.
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = sortedRows.slice(
    safePage * rowsPerPage,
    safePage * rowsPerPage + rowsPerPage
  );
  const firstRowIndex = sortedRows.length === 0 ? 0 : safePage * rowsPerPage + 1;
  const lastRowIndex = Math.min((safePage + 1) * rowsPerPage, sortedRows.length);

  return (
    <div className="w-full">
      <div className="mb-2 w-full rounded-md border bg-card shadow-sm">
        <TransactionsToolbar numSelected={selected.length} />
        <Table aria-labelledby="tableTitle">
          <TableHeader className="h-auto md:h-auto">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={(checked) =>
                    handleSelectAllClick(checked === true)
                  }
                  aria-label="Select all transactions"
                />
              </TableHead>
              {headCells.map((headCell) => {
                const active = orderBy === headCell.id;
                return (
                  <TableHead
                    key={headCell.id}
                    className={headCell.numeric ? "text-right" : undefined}
                  >
                    <SortButton
                      active={active}
                      direction={active ? order : "asc"}
                      onClick={() => handleRequestSort(headCell.id)}
                    >
                      {headCell.label}
                    </SortButton>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleRows.map((row, index) => {
              const isItemSelected = isSelected(row.id);
              const labelId = `enhanced-table-checkbox-${index}`;

              return (
                <TableRow
                  key={row.id}
                  data-state={isItemSelected ? "selected" : undefined}
                  onClick={(event) => handleClick(event, row.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  className="cursor-pointer hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <TableCell className="w-12">
                    <Checkbox
                      checked={isItemSelected}
                      onCheckedChange={() => handleClick(
                        { stopPropagation: () => {} } as React.MouseEvent<HTMLTableRowElement>,
                        row.id
                      )}
                      aria-labelledby={labelId}
                    />
                  </TableCell>
                  <TableCell id={labelId} className="font-medium">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-right">{row.reference}</TableCell>
                  <TableCell className="text-right">{row.type}</TableCell>
                  <TableCell className="text-right">{row.amount}</TableCell>
                  <TableCell className="text-right">{row.date}</TableCell>
                  <TableCell className="text-right">
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
                  <TableCell className="text-right">{row.charges}</TableCell>
                </TableRow>
              );
            })}

            {sortedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {sortedRows.length === 0
              ? "0 of 0"
              : `${firstRowIndex}-${lastRowIndex} of ${sortedRows.length}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {safePage + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}