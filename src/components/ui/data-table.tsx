"use client";

// The shadcn/ui "Data Table" pattern (https://ui.shadcn.com/docs/components/base/data-table),
// adapted to this app: TanStack Table under the hood for sorting, filtering,
// and column visibility, but paginated with this app's own <Pagination>
// component (so page-size selector, numbered pages etc. stay visually
// consistent with every other table in the app) instead of shadcn's plain
// Previous/Next buttons.
//
// Usage: define `columns: ColumnDef<T>[]` for a row shape T, pass the full
// (already-loaded) data array, and this renders the sortable/filterable/
// paginated table. Filtering and pagination happen client-side over
// `data`, same as the shadcn example - so this fits pages with a few
// hundred rows at most, which matches every list this app has.

import { useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";

export { ArrowUpDown };

/** Wraps a column header label with a click-to-sort button + arrow icon - the
 *  standard shadcn data-table sortable-header pattern. Use as a column's
 *  `header` render function. */
export function SortableHeader({
  column,
  label,
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-slate-400" />
    </Button>
  );
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column id to filter on with the built-in search box (e.g. "name"). Omit to hide the search box - use this when the page already has its own SearchBar. */
  filterColumnId?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  /** Shows the "Columns" visibility-toggle dropdown. Defaults to on. */
  showColumnToggle?: boolean;
  pageSize?: number;
  /** When supplied, pagination is controlled by the server/page owner. */
  serverPagination?: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
};

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder = "Filter...",
  emptyMessage = "No results.",
  showColumnToggle = true,
  pageSize = 8,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    ...(serverPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters, columnVisibility, pagination },
  });

  const total = serverPagination?.total ?? table.getFilteredRowModel().rows.length;
  const totalPages = serverPagination?.totalPages ?? (table.getPageCount() || 1);

  return (
    <div>
      {(filterColumnId || showColumnToggle) && (
        <div className="mb-4 flex items-center gap-3">
          {filterColumnId && (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn(filterColumnId)?.setFilterValue(e.target.value)}
              className="max-w-sm"
            />
          )}
          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="capitalize"
                      checked={col.getIsVisible()}
                      onCheckedChange={(value) => col.toggleVisibility(!!value)}
                    >
                      {col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <Pagination
          page={serverPagination?.page ?? pagination.pageIndex + 1}
          totalPages={serverPagination?.totalPages ?? totalPages}
          total={serverPagination?.total ?? total}
          pageSize={serverPagination?.pageSize ?? pagination.pageSize}
          onPageChange={serverPagination?.onPageChange ?? ((page) => table.setPageIndex(page - 1))}
          onPageSizeChange={serverPagination?.onPageSizeChange ?? ((size) => table.setPageSize(size))}
        />
      </div>
    </div>
  );
}
