import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from '@tanstack/react-table';
import { put } from '../api/client';
import { ChevronUp, ChevronDown, ChevronsUpDown, FileX2 } from 'lucide-react';
import clsx from 'clsx';
import { Case, CaseRow, CaseTableProps } from '../types';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-50 text-slate-600 border-slate-200',
  medium: 'bg-orange-50 text-orange-700 border-orange-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};

interface StatusBadgeProps {
  status: Case['status'];
  onChange: (newStatus: Case['status']) => void;
}

function StatusBadge({ status, onChange }: StatusBadgeProps) {
  const [editing, setEditing] = useState<boolean>(false);

  if (editing) {
    return (
      <select
        value={status}
        onChange={(e) => {
          const newStatus = e.target.value as Case['status'];
          setEditing(false);
          if (newStatus !== status) {
            onChange(newStatus);
          }
        }}
        onBlur={() => setEditing(false)}
        autoFocus
        className="rounded border border-slate-300 px-2 py-0.5 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="open">open</option>
        <option value="in_progress">in progress</option>
        <option value="resolved">resolved</option>
      </select>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={clsx(
        'rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        STATUS_COLORS[status] || 'bg-slate-50 text-slate-600'
      )}
    >
      {status.replace('_', ' ')}
    </button>
  );
}

export default function CaseTable({
  cases,
  onCaseClick,
  onCaseUpdate,
  onRefresh,
}: CaseTableProps) {
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const handleStatusChange = async (caseId: string, newStatus: Case['status']): Promise<void> => {
    try {
      await put(`/cases/${caseId}`, { status: newStatus });
      onCaseUpdate?.(caseId, { status: newStatus });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const columns = useMemo<ColumnDef<CaseRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded border-slate-300"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-slate-300"
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-slate-500">
            {(getValue() as string)?.substring(0, 8)}…
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => (
          <span className="font-medium text-slate-900">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            onChange={(newStatus) => void handleStatusChange(row.original.id, newStatus)}
          />
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ getValue }) => (
          <span
            className={clsx(
              'rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
              PRIORITY_COLORS[getValue() as string] || 'bg-slate-50 text-slate-600'
            )}
          >
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'assigned_to_name',
        header: 'Assigned To',
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        cell: ({ getValue }) =>
          getValue() ? new Date(getValue() as string).toLocaleDateString() : '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCaseClick?.(row.original);
            }}
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            View
          </button>
        ),
        size: 80,
      },
    ],
    [onCaseClick, onCaseUpdate, onRefresh]
  );

  const filteredData = useMemo(() => {
    let data = cases || [];
    if (statusFilter) {
      data = data.filter((c) => c.status === statusFilter);
    }
    return data;
  }, [cases, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedCount = Object.keys(rowSelection).length;

  if (!cases || cases.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16">
        <FileX2 className="h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-lg font-medium text-slate-900">No cases yet</h3>
        <p className="mt-1 text-sm text-slate-500">Create your first case to get started</p>
      </div>
    );
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search cases..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="input-field max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field max-w-[140px]"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        {selectedCount > 0 && (
          <span className="text-sm text-slate-500">{selectedCount} selected</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-slate-900"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUp className="h-3 w-3" />,
                          desc: <ChevronDown className="h-3 w-3" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                onClick={() => onCaseClick?.(row.original)}
                className={clsx(
                  'cursor-pointer transition-colors hover:bg-accent/5',
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border border-slate-200 px-3 py-2 text-slate-700"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="btn-secondary !px-2 !py-1 text-xs disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="btn-secondary !px-2 !py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
