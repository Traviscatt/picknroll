import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PanelFooter {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Muted text on the left */
  note?: React.ReactNode;
}

interface PanelProps {
  title: React.ReactNode;
  /** Right side of the header (toggle, caption, select) */
  aside?: React.ReactNode;
  /** Red pulsing dot before the title (fixed LIVE color) */
  live?: boolean;
  /** Small muted count after the title, e.g. "3 games" */
  count?: React.ReactNode;
  footer?: PanelFooter;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/** The card used across Home and Game Center: title row, rows, optional "… →" footer */
export function Panel({ title, aside, live, count, footer, id, className, children }: PanelProps) {
  const footerLink = footer && (
    <span className="font-semibold text-primary">
      {footer.label} →
    </span>
  );
  return (
    <section id={id} className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h3 className="flex min-w-0 items-center gap-2 font-semibold">
          {live && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600" />}
          <span className="truncate">{title}</span>
          {count != null && <span className="shrink-0 text-xs font-normal text-muted-foreground">{count}</span>}
        </h3>
        {aside}
      </div>
      {children}
      {footer && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs">
          <span className="text-muted-foreground">{footer.note}</span>
          {footer.href ? (
            <Link href={footer.href} onClick={footer.onClick} className="shrink-0">
              {footerLink}
            </Link>
          ) : (
            <button type="button" onClick={footer.onClick} className="shrink-0">
              {footerLink}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
