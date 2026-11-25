"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BracketStatusBadge } from "@/components/shared/bracket-status-badge";
import { Panel } from "@/components/shared/panel";
import { cn } from "@/lib/utils";
import { paymentDetails } from "@/lib/payment";
import { bracketActions, nextStep, type SeasonEntry, type SeasonPool } from "@/lib/season";

/** Each entry this season with how far along it is and what to do next (before the deadline) */
export function EntryChecklist({ pool, entries }: { pool: SeasonPool; entries: SeasonEntry[] }) {
  const fee = paymentDetails(pool).feeLabel;
  const canAdd = pool.status === "OPEN";
  return (
    <Panel
      title="Your entries"
      count={entries.length || undefined}
      aside={
        canAdd &&
        entries.length > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link href="/brackets/new">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Link>
          </Button>
        )
      }
      footer={{ label: "My Brackets", href: "/brackets", note: `Submit and pay (${fee} each) before the deadline` }}
    >
      {entries.length === 0 ? (
        <div className="border-t px-4 py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">You don&apos;t have a bracket yet this season.</p>
          {canAdd && (
            <Button asChild>
              <Link href="/brackets/new">
                Start your bracket <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y border-t">
          {entries.map((entry) => {
            const step = nextStep(entry, bracketActions({ status: entry.status, pool }).locked);
            const pct = entry.totalGames ? (entry.picked / entry.totalGames) * 100 : 0;
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/brackets/${entry.id}`} className="truncate font-medium hover:underline">
                      {entry.name}
                    </Link>
                    <BracketStatusBadge status={entry.status} paid={entry.paid} paymentPending={entry.paymentPending} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {entry.picked}/{entry.totalGames} picked · for {entry.entryName}
                    </span>
                  </div>
                </div>
                <Button asChild size="sm" variant={step.primary ? "default" : "ghost"}>
                  <Link href={step.href}>{step.label}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
