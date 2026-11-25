"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock, Target, Trophy } from "lucide-react";
import { FINAL_FOUR_BONUS, MAX_POSSIBLE_SCORE, SCORING_RULES, getScoringRule } from "@/lib/scoring";
import { formatDeadline } from "@/lib/season";
import { cn } from "@/lib/utils";
import { RankBadge } from "@/components/game-center/parts";

const sweet16 = getScoringRule(3)?.pointsPerChoice ?? [];

/** Opens the rules panel on Home (More → Rules & scoring when already on Home, where the hash alone doesn't re-render) */
export const OPEN_RULES_EVENT = "pnr:open-rules";

/** Rules and scoring, generated from SCORING_RULES and the pool. Collapsed panel on Home (#rules opens it). */
export function ScoringRules({ deadline }: { deadline: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const reveal = () => {
      setOpen(true);
      requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "start" }));
    };
    const onHash = () => window.location.hash === "#rules" && reveal();
    onHash();
    window.addEventListener(OPEN_RULES_EVENT, reveal);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener(OPEN_RULES_EVENT, reveal);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  return (
    <section id="rules" ref={ref} className="scroll-mt-20 overflow-hidden rounded-xl border bg-card shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block font-semibold">How scoring works</span>
          <span className="block text-xs text-muted-foreground">Later rounds let you rank more teams. Higher ranks pay more.</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-4 border-t p-4">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" /> Points per round
            </h3>
            <div className="divide-y rounded-lg border">
              {SCORING_RULES.map((rule) => (
                <div key={rule.round} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{rule.roundName}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.choices === 1 ? "1 pick per game" : `Rank ${rule.choices} teams per game`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {rule.pointsPerChoice.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums">
                        {rule.choices > 1 && <RankBadge rank={i + 1} />}
                        {p}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              +{FINAL_FOUR_BONUS} bonus for picking all four Final Four teams as your 1st choice. Best possible score: {MAX_POSSIBLE_SCORE}.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
              <Clock className="h-4 w-4" /> Deadline
            </p>
            <p className="mt-1 text-sm text-amber-900">Submit and pay before the first Round 1 tip-off:</p>
            <p className="mt-1 font-bold text-amber-900">{deadline ? formatDeadline(deadline) : "To be announced"}</p>
          </div>
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-muted-foreground" /> Tiebreaker
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Total points scored in the championship game. Ties go to the closest guess.</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: a Sweet 16 game ranked {"\u201C"}1. Duke, 2. Kansas{"\u201D"} earns {sweet16[0]} if Duke wins, {sweet16[1]} if Kansas wins.
          </p>
        </div>
      )}
    </section>
  );
}
