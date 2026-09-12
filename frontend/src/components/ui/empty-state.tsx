import type { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-dashed border-stone-border bg-white/60 backdrop-blur-xs',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-sand-light/60 flex items-center justify-center text-navy mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-stone-muted max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button variant="default" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
