import * as React from "react";
import { cn } from "../../lib/utils";

// ─── Input ────────────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded border border-stone-border bg-white px-3 py-2 text-sm",
        "placeholder:text-stone-muted focus:outline-none focus:ring-1 focus:ring-navy",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ─── Label ─────────────────────────────────────────────────────────────────────
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-xs font-semibold uppercase tracking-wide text-foreground/70", className)}
    {...props}
  />
));
Label.displayName = "Label";

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[100px] w-full rounded border border-stone-border bg-white px-3 py-2 text-sm",
      "placeholder:text-stone-muted focus:outline-none focus:ring-1 focus:ring-navy",
      "disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded border border-stone-border bg-white px-3 py-2 text-sm",
      "focus:outline-none focus:ring-1 focus:ring-navy",
      "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("bg-white border border-stone-border rounded-sm", className)}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 border-b border-stone-border", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-4 border-t border-stone-border", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

// ─── Badge ─────────────────────────────────────────────────────────────────────
export type BadgeVariant = 'default' | 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'open' | 'closed' | 'completed' | 'finished' | 'in-progress';

const badgeVariants: Record<BadgeVariant, string> = {
  default:   'bg-[#EDE7D9] text-[#3A4A35]',
  pending:   'bg-amber-50 text-amber-800 border border-amber-200',
  accepted:  'bg-[#E4EDE0] text-[#1C3A28] border border-[#BDD0B4]',
  rejected:  'bg-red-50 text-red-700 border border-red-200',
  withdrawn: 'bg-[#EDE7D9] text-[#6E8569] border border-[#CDD9C6]',
  open:      'bg-[#E4EDE0] text-[#1C3A28] border border-[#BDD0B4]',
  closed:    'bg-[#EDE7D9] text-[#6E8569] border border-[#CDD9C6]',
  completed: 'bg-amber-50 text-amber-800 border border-amber-200',
  finished:  'bg-[#1C3A28]/10 text-[#1C3A28] border border-[#BDD0B4]',
  'in-progress': 'bg-sky-50 text-sky-800 border border-sky-200',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full',
      badgeVariants[variant],
      className
    )}
    {...props}
  />
);

// ─── Separator ────────────────────────────────────────────────────────────────
export const Separator = ({ className }: { className?: string }) => (
  <hr className={cn('border-stone-border', className)} />
);

// ─── Form Field wrapper ────────────────────────────────────────────────────────
export const FormField = ({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);
