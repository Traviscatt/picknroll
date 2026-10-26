"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BracketStatusBadge } from "@/components/shared/bracket-status-badge";
import { cn } from "@/lib/utils";
import { paymentDetails } from "@/lib/payment";
import { bracketActions, formatDeadline, nextStep, timeLeft, type SeasonEntry, type SeasonPool } from "@/lib/season";

/** Countdown to the deadline (frame-themed card) */
export function DeadlineCountdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const left = timeLeft(deadline, now);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-frame p-4 text-frame-foreground">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-team-secondary">Picks lock in</p>
        <p className="text-3xl font-bold tracking-tight">{left ?? "a moment"}</p>
        <p className="mt-0.5 text-xs opacity-80">{formatDeadline(deadline)} · first Round 1 tip-off</p>
      </div>
      <Clock className="h-10 w-10 shrink-0 opacity-30" />
    </div>
  );
}

/** Each entry this season with how far along it is and what to do next */
export function EntryChecklist({ pool, entries }: { pool: SeasonPool; entries: SeasonEntry[] }) {
  const fee = paymentDetails(pool).feeLabel;
  const canAdd = pool.status === "OPEN";
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">Your entries</h2>
          <p className="text-xs text-muted-foreground">Submitted and paid ({fee} each) before the deadline</p>
        </div>
        {canAdd && entries.length > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link href="/brackets/new">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Link>
          </Button>
        )}
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-8 text-center">
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
        <div className="divide-y">
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
    </section>
  );
}
