"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
  useReactTable,
  FilterFn,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import AppSmartSearch from "../app-smart-search/AppSmartSearch";
import AppIconButton from "../app-icon-button/AppIconButton";
import { Download } from "lucide-react";
import { DataTableProps } from "@/types";
import { colors } from "@/config/theme";

const fuzzyFilter: FilterFn<any> = (row, columnId, value) => {
  const raw = row.getValue(columnId);
  return String(raw ?? "")
    .toLowerCase()
    .includes(String(value).toLowerCase());
};

export function DataTable<TData, TValue>({
  columns,
  data,
  initialSearch = "",
  onRowClick,
  rowClassName,
  exculdeColumns,
  showDownload = true,
  maxHeight,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 12,
  });
  const [globalFilter, setGlobalFilter] = React.useState(initialSearch ?? "");
  const [filteredData, setFilteredData] = React.useState<any[]>(data ?? []);

  const columnsWithSerial = React.useMemo(() => {
    const serialCol: ColumnDef<TData, any> = {
      id: "sn",
      header: "S no.",
      cell: (info) => {
        const pageIndex = pagination.pageIndex || 0;
        const pageSize = pagination.pageSize || 1;
        const absoluteIndex = info.row.index;

        let rowIndexOnPage: number;
        if (
          absoluteIndex >= pageIndex * pageSize &&
          absoluteIndex < (pageIndex + 1) * pageSize
        ) {
          rowIndexOnPage = absoluteIndex - pageIndex * pageSize;
        } else {
          rowIndexOnPage = absoluteIndex;
        }

        return String(pageIndex * pageSize + rowIndexOnPage + 1);
      },
      enableSorting: false,
      size: 50,
    };

    return [serialCol, ...(columns as ColumnDef<TData, any>[])];
  }, [columns, pagination.pageIndex, pagination.pageSize]);

  const table = useReactTable({
    data: filteredData,
    columns: columnsWithSerial,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: { fuzzy: fuzzyFilter },
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
    },
    globalFilterFn: fuzzyFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
  });

  const exportCsv = () => {
    const rowsToExport = table.getPrePaginationRowModel().rows;
    const visibleCols = table
      .getAllColumns()
      .filter((col) => col.getIsVisible());

    if (rowsToExport.length === 0 || visibleCols.length === 0) return;

    const headers = visibleCols.map((col) => {
      const h = col.columnDef.header as any;
      return typeof h === "string" ? h : col.id;
    });

    const getTextFromReact = (el: any): string => {
      if (el == null) return "";
      if (
        typeof el === "string" ||
        typeof el === "number" ||
        typeof el === "boolean"
      )
        return String(el);
      if (Array.isArray(el)) return el.map((c) => getTextFromReact(c)).join("");
      if (React.isValidElement(el)) {
        const props: any = (el as any).props;
        return getTextFromReact(props?.children);
      }
      try {
        return JSON.stringify(el);
      } catch {
        return String(el);
      }
    };

    const getValueFromRow = (row: any, col: any) => {
      const colDef: any = col.columnDef;

      if (col.id === "sn") {
        const idx = typeof row.index === "number" ? row.index : 0;
        return String(idx + 1);
      }

      try {
        if (colDef.accessorKey) {
          const path = String(colDef.accessorKey);
          const value = path
            .split(".")
            .reduce(
              (acc: any, key: string) => (acc ? acc[key] : undefined),
              row.original
            );
          return value;
        }
        if (colDef.accessorFn) {
          return colDef.accessorFn(row.original);
        }
      } catch {
        // fallback
      }

      try {
        if (typeof row.getValue === "function") {
          return row.getValue(col.id as string);
        }
      } catch {
        // fallback
      }

      const cell = row.getAllCells().find((c: any) => c.column.id === col.id);
      if (cell) {
        const rendered = flexRender(
          cell.column.columnDef.cell,
          cell.getContext()
        );
        return getTextFromReact(rendered ?? "");
      }

      return "";
    };

    const csvRows = rowsToExport.map((r) =>
      visibleCols
        .map((col) => {
          const val = getValueFromRow(r, col) ?? "";
          const str =
            typeof val === "object" ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    setGlobalFilter(initialSearch ?? "");
  }, [initialSearch]);

  React.useEffect(() => {
    setFilteredData(data ?? []);
  }, [data]);

  const effectiveMaxHeight = maxHeight ?? "75vh";

  return (
    <div>
      <div className="flex items-center gap-2 mt-2">
        <AppSmartSearch
          columns={columns}
          rows={data}
          onFilteredData={(rows) => setFilteredData(rows)}
          onSearchText={(txt) => setGlobalFilter(String(txt ?? ""))}
          excludeColumns={exculdeColumns}
          initialSearch={initialSearch}
        />

        {showDownload && (
          <AppIconButton
            icon={Download}
            onClick={exportCsv}
            disabled={
              table.getPrePaginationRowModel().rows.length === 0 ||
              table.getAllColumns().filter((col) => col.getIsVisible())
                .length === 0
            }
          />
        )}
      </div>

      <div
        className="rounded-lg mt-2"
        style={{
          maxHeight:
            typeof effectiveMaxHeight === "number"
              ? `${effectiveMaxHeight}px`
              : effectiveMaxHeight,
          overflow: "auto",
          border: `1px solid ${colors.border}`,
        }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                style={{
                  backgroundColor: colors.backgroundElevated,
                  borderColor: colors.border,
                }}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ color: colors.text }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className={rowClassName}
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  style={{
                    borderColor: colors.border,
                    cursor: onRowClick ? "pointer" : undefined,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ color: colors.text }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSerial.length}
                  className="h-24 text-center"
                  style={{ color: colors.textMuted }}
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center space-x-2 py-4">
        <div className="text-sm" style={{ color: colors.textMuted }}>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>

        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
