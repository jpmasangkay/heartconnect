import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-stone-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-stone-muted',
          actionButton:
            'group-[.toast]:bg-navy group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium hover:group-[.toast]:bg-navy-light transition-colors',
          cancelButton:
            'group-[.toast]:bg-sand-light group-[.toast]:text-stone-muted group-[.toast]:rounded-lg',
        },
      }}
      {...props}
    />
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { Toaster, toast };
