import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** `inverse` = light shimmer on dark backgrounds (e.g. navy hero). */
  variant?: 'default' | 'inverse';
}

export function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'block min-h-[1em] shrink-0',
        variant === 'inverse' ? 'skeleton-inverse' : 'skeleton',
        className,
      )}
      {...props}
    />
  );
}

/** Matches `JobCard` layout for the job board grid. */
export function JobCardSkeleton() {
  return (
    <div
      className="pointer-events-none bg-white border border-stone-border rounded-lg p-5 h-full min-h-[210px] flex flex-col select-none"
      aria-hidden
    >
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <Skeleton className="h-6 w-[7.5rem] rounded-full" />
        <Skeleton className="h-3 w-14 rounded" />
      </div>
      <div className="space-y-2 mb-2 shrink-0">
        <Skeleton className="h-4 w-[92%] rounded" />
        <Skeleton className="h-4 w-[64%] rounded" />
      </div>
      <div className="flex-1 space-y-2 mb-4 min-h-[2.75rem]">
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-[91%] rounded" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-stone-border/60 shrink-0">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-4 w-[5.5rem] rounded" />
      </div>
    </div>
  );
}
