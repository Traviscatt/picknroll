import { CheckCircle, Clock, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

export type BracketStatus = "DRAFT" | "SUBMITTED" | "PAID" | string;

interface BracketStatusBadgeProps {
  status: BracketStatus;
  paid?: boolean;
  paymentPending?: boolean;
  /** Payment state is private: other members only see Draft or Submitted */
  isOwner?: boolean;
  className?: string;
}

const STYLES = {
  draft: { label: "Draft", icon: Clock, className: "border-border text-muted-foreground" },
  submitted: { label: "Submitted", icon: CheckCircle, className: "border-transparent bg-secondary text-secondary-foreground" },
  pending: { label: "Payment pending", icon: Hourglass, className: "border-amber-200 bg-amber-50 text-amber-800" },
  paid: { label: "Paid", icon: CheckCircle, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
};

/** One status badge for every bracket list (fixed colors, never team-themed) */
export function BracketStatusBadge({ status, paid = false, paymentPending = false, isOwner = true, className }: BracketStatusBadgeProps) {
  const key =
    status === "DRAFT" ? "draft" : !isOwner ? "submitted" : paid || status === "PAID" ? "paid" : paymentPending ? "pending" : "submitted";
  const { label, icon: Icon, className: style } = STYLES[key];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", style, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
