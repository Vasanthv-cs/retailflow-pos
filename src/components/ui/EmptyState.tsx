import React from 'react';
import { cn } from '@/src/utils/cn';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
