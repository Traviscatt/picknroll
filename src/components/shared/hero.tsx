import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeroProps {
  /** Small uppercase line at the top */
  label: React.ReactNode;
  /** Big value on the left (rank, countdown, title) */
  value: React.ReactNode;
  /** "md" for longer values (countdowns, titles) */
  size?: "lg" | "md";
  caption?: React.ReactNode;
  /** Under the big value, e.g. a movement pill */
  badge?: React.ReactNode;
  /** Big number on the right */
  side?: { value: React.ReactNode; caption?: React.ReactNode; extra?: React.ReactNode };
  stats?: { value: React.ReactNode; label: string }[];
  /** Up to two HeroActions */
  actions?: React.ReactNode;
  /** Extra content between the stats and the actions */
  children?: React.ReactNode;
}

/** Team-themed card at the top of Home and Game Center (frame colors only) */
export function Hero({ label, value, size = "lg", caption, badge, side, stats, actions, children }: HeroProps) {
  return (
    <div className="space-y-3.5 rounded-2xl bg-frame p-4 text-frame-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-frame-accent">{label}</p>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className={cn("font-bold tracking-tight", size === "lg" ? "text-4xl" : "text-2xl sm:text-3xl")}>{value}</span>
            {caption && <span className="text-xs opacity-75">{caption}</span>}
          </div>
          {badge}
        </div>
        {side && (
          <div className="shrink-0 text-right">
            <p className="text-3xl font-bold tabular-nums">{side.value}</p>
            {side.caption && <p className="text-[10px] opacity-75">{side.caption}</p>}
            {side.extra}
          </div>
        )}
      </div>
      {stats && stats.length > 0 && (
        <>
          <div className="h-px bg-white/15" />
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="truncate font-semibold">{s.value}</p>
                <p className="text-[10px] opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {children}
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

const ACTION = "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold";
const VARIANTS = {
  solid: "bg-card text-primary dark:text-foreground",
  outline: "border border-white/35",
};

/** Hero button: solid (card on frame) or outlined. Renders a Link when `href` is set. */
export function HeroAction({
  href,
  onClick,
  variant = "solid",
  children,
}: {
  href?: string;
  onClick?: () => void;
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  const className = cn(ACTION, VARIANTS[variant]);
  return href ? (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
