import { BookOpen, Clock, Target, Trophy } from "lucide-react";
import { FINAL_FOUR_BONUS, MAX_POSSIBLE_SCORE, SCORING_RULES, getScoringRule } from "@/lib/scoring";
import { formatDeadline } from "@/lib/season";
import { RankBadge } from "@/components/game-center/parts";

const sweet16 = getScoringRule(3)?.pointsPerChoice ?? [];

/** Rounds grouped the way the pool explains them (landing page and rules) */
export function scoringGroups() {
  const group = (rounds: number[], label: string, title: string) => {
    const rules = SCORING_RULES.filter((r) => rounds.includes(r.round));
    const counts = [...new Set(rules.map((r) => r.choices))];
    const detail = counts.length === 1 && counts[0] === 1 ? "Pick one winner per game" : `Rank ${counts.join("–")} teams per game`;
    return { label, title, detail, rules };
  };
  return [
    group([1, 2], "Rounds 1 & 2", "Traditional picks"),
    group([3, 4], "Sweet 16 & Elite 8", "Multi-choice picks"),
    group([5, 6], "Final Four & Championship", "Maximum hedging"),
  ];
}

/** Rules and scoring, generated from SCORING_RULES and the pool (Home #rules) */
export function ScoringRules({ deadline }: { deadline: string | null }) {
  return (
    <section id="rules" className="scroll-mt-20 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold">Rules &amp; scoring</h2>
          <p className="text-sm text-muted-foreground">Later rounds let you rank more teams. Higher ranks pay more.</p>
        </div>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
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
        <div className="space-y-3">
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
            <p className="mt-1 text-sm text-muted-foreground">
              Total points scored in the championship game. Ties go to the closest guess.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: a Sweet 16 game ranked {"\u201C"}1. Duke, 2. Kansas{"\u201D"} earns {sweet16[0]} if Duke wins, {sweet16[1]} if Kansas wins.
          </p>
        </div>
      </div>
    </section>
  );
}
