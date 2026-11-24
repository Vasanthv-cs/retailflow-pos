import React from 'react';
import { cn } from '@/src/utils/cn';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  rowClassName?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No records found.',
  rowClassName,
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={cn(
                    'py-3 whitespace-nowrap',
                    idx === 0 ? 'pl-5 pr-4' : idx === columns.length - 1 ? 'pl-4 pr-5' : 'px-4',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    'hover:bg-slate-50/70 transition-colors',
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((col, idx) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-3',
                        idx === 0
                          ? 'pl-5 pr-4'
                          : idx === columns.length - 1
                          ? 'pl-4 pr-5'
                          : 'px-4',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
