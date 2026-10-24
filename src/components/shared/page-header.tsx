import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons on the right (wrap below the title on phones) */
  actions?: React.ReactNode;
  /** Shown before the title, e.g. a back button */
  leading?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, leading, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {leading}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {description && <div className="mt-1 text-sm text-muted-foreground md:text-base">{description}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
