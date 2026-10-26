"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCORING_RULES } from "@/lib/scoring";
import { choiceResult, choicesFor, eligibleTeams, pointsFor, type GameSlot, type Picks } from "@/lib/picker";
import type { RoundSummary } from "@/lib/bracket-summary";
import type { PickerTeam } from "@/components/picker/game-picker";
import type { BracketResults } from "./DesktopBracketView";
import { PickRow } from "./pick-row";

const roundName = (round: number) => SCORING_RULES.find((r) => r.round === round)?.roundName ?? `Round ${round}`;

interface BracketSectionsProps {
  regions: string[];
  games: GameSlot[];
  picks: Picks;
  team: (id: string) => PickerTeam;
  results: BracketResults;
  rounds: RoundSummary[];
  tiebreaker: number | null;
  onOpenGame: (game: GameSlot) => void;
}

/**
 * Phone bracket, biggest picks first: Championship + Final Four, then the round being played, then
 * the other rounds as collapsible rows (upcoming first, then finished, most recent first).
 */
export function BracketSections({ regions, games, picks, team, results, rounds, tiebreaker, onOpenGame }: BracketSectionsProps) {
  const undecided = (round: number) => games.some((g) => g.round === round && !results.winners.has(g.gameId));
  const current = [1, 2, 3, 4].find(undecided) ?? null;
  const later = [1, 2, 3, 4].filter((r) => current != null && r > current);
  const finished = [4, 3, 2, 1].filter((r) => current == null || r < current);
  const finals = games.filter((g) => g.round >= 5).sort((a, b) => b.round - a.round || a.number - b.number);
  const [ff, champ] = [rounds[4], rounds[5]];
  const finalsEarned = (ff?.earned ?? 0) + (champ?.earned ?? 0);
  const finalsPossible = (ff?.possible ?? 0) + (champ?.possible ?? 0);
  const finalsDetail = finalsEarned
    ? `${finalsEarned} earned · ${finalsPossible} still possible`
    : `${finalsPossible} of ${(ff?.max ?? 0) + (champ?.max ?? 0)} still possible`;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionHeader title="Final Four & Championship" detail={finalsDetail} />
        {finals.map((g) => (
          <GameCard key={g.gameId} game={g} picks={picks} team={team} results={results} label={finalLabel(g, regions)} onOpen={onOpenGame} />
        ))}
        {tiebreaker != null && (
          <p className="rounded-lg border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">Tiebreaker (championship total):</span> <span className="font-bold">{tiebreaker}</span>
          </p>
        )}
      </section>

      {current != null && (
        <section className="space-y-3">
          <SectionHeader title={roundName(current)} detail={`Being played · ${rounds[current - 1].possible} of ${rounds[current - 1].max - rounds[current - 1].earned} still possible`} />
          <RoundGames round={current} games={games} regions={regions} picks={picks} team={team} results={results} onOpen={onOpenGame} />
        </section>
      )}

      {(later.length > 0 || finished.length > 0) && (
        <section className="space-y-2">
          {later.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground">Coming up</h3>}
          {later.map((r) => (
            <RoundRow key={r} round={r} summary={rounds[r - 1]} upcoming>
              <RoundGames round={r} games={games} regions={regions} picks={picks} team={team} results={results} onOpen={onOpenGame} />
            </RoundRow>
          ))}
          {finished.length > 0 && <h3 className="pt-2 text-sm font-semibold text-muted-foreground">Finished rounds</h3>}
          {finished.map((r) => (
            <RoundRow key={r} round={r} summary={rounds[r - 1]}>
              <RoundGames round={r} games={games} regions={regions} picks={picks} team={team} results={results} onOpen={onOpenGame} />
            </RoundRow>
          ))}
        </section>
      )}
    </div>
  );
}

const finalLabel = (g: GameSlot, regions: string[]) =>
  g.round === 6 ? "Championship" : `${regions[(g.number - 1) * 2]} vs ${regions[(g.number - 1) * 2 + 1]}`;

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-semibold">{title}</h2>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function RoundRow({ round, summary, upcoming = false, children }: { round: number; summary: RoundSummary; upcoming?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pts = `${pointsFor(round).join(" / ")} pts`;
  const detail = upcoming
    ? `${summary.possible} of ${summary.max} still possible · ${pts}`
    : `${summary.firstChoiceRight} of ${summary.games} ${choicesFor(round) > 1 ? "1st choices right" : "right"} · ${pts}`;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{roundName(round)}</span>
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums">{upcoming ? `${summary.possible}` : `${summary.earned} / ${summary.max}`}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t bg-muted/30 p-3">{children}</div>}
    </div>
  );
}

function RoundGames({ round, games, regions, picks, team, results, onOpen }: { round: number; games: GameSlot[]; regions: string[]; picks: Picks; team: (id: string) => PickerTeam; results: BracketResults; onOpen: (game: GameSlot) => void }) {
  return (
    <div className="space-y-4">
      {regions.map((region) => {
        const list = games.filter((g) => g.round === round && g.region === region);
        if (!list.length) return null;
        return (
          <div key={region} className="space-y-2">
            {round < 4 && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{region}</p>}
            <div className={cn("grid gap-2", round <= 2 && "sm:grid-cols-2")}>
              {list.map((g) => (
                <GameCard key={g.gameId} game={g} picks={picks} team={team} results={results} label={round === 4 ? region : `Game ${g.number}`} compact={round <= 2} onOpen={onOpen} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GameCard({ game, picks, team, results, label, compact = false, onOpen }: { game: GameSlot; picks: Picks; team: (id: string) => PickerTeam; results: BracketResults; label: string; compact?: boolean; onOpen: (game: GameSlot) => void }) {
  const choices = picks.get(game.gameId)?.choices ?? [];
  const winner = results.winners.get(game.gameId) ?? null;
  const multi = choicesFor(game.round) > 1;
  const points = pointsFor(game.round);
  const rows = game.round === 1 ? eligibleTeams(game, picks) : choices;
  return (
    <button
      type="button"
      onClick={() => onOpen(game)}
      className={cn("block w-full space-y-1.5 rounded-xl border bg-card text-left transition-colors hover:border-foreground/30", compact ? "p-2" : "p-3", winner && "border-foreground/25")}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-[11px] text-muted-foreground">{winner ? "Final" : `${points.join(" / ")} pts`}</span>
      </div>
      {rows.length === 0 && <p className="px-1 text-xs text-muted-foreground">No pick</p>}
      {rows.map((teamId, i) => {
        const picked = game.round === 1 ? choices[0] === teamId : true;
        const index = game.round === 1 ? 0 : i;
        return (
          <PickRow
            key={teamId}
            team={team(teamId)}
            state={choiceResult(teamId, winner, results.eliminated)}
            points={points[index] ?? 0}
            rank={multi ? i + 1 : undefined}
            pct={picked ? results.pct?.[game.gameId]?.[`${index}:${teamId}`] : undefined}
            unpicked={!picked}
          />
        );
      })}
    </button>
  );
}
