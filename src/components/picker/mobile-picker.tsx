"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Lock, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCORING_RULES } from "@/lib/scoring";
import { ROUND_LABELS } from "@/lib/live";
import {
  eligibleTeams,
  isUnlocked,
  stepComplete,
  type GameSlot,
  type Picks,
  type Step,
  type TapResult,
} from "@/lib/picker";
import { GamePicker, type PickerTeam } from "./game-picker";

interface MobilePickerProps {
  steps: Step[];
  regions: string[];
  picks: Picks;
  byId: Map<string, GameSlot>;
  team: (id: string) => PickerTeam;
  onTap: (game: GameSlot, teamId: string) => { result: TapResult; picks: Picks };
  onReorder: (game: GameSlot, order: string[]) => void;
  onUndo: () => void;
  canUndo: boolean;
  /** Shown on the Championship card (tiebreaker + submit) */
  finale: React.ReactNode;
}

const ROUND_SHORT: Record<number, string> = { 1: "R1", 2: "R2", 3: "S16", 4: "E8", 5: "F4", 6: "Final" };
const gameLabel = (game: GameSlot) => (game.round <= 4 ? `Game ${game.number}` : game.round === 5 ? `Semifinal ${game.number}` : "Championship");

export function MobilePicker({ steps, regions, picks, byId, team, onTap, onReorder, onUndo, canUndo, finale }: MobilePickerProps) {
  const firstOpen = Math.max(0, steps.findIndex((s) => !stepComplete(s, picks)));
  const [nav, setNav] = useState<{ index: number | null; dir: number }>({ index: null, dir: 1 });
  const current = nav.index ?? firstOpen;
  const step = steps[current];
  const direction = nav.dir;
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const go = (next: number) => {
    clearTimeout(advanceTimer.current);
    if (next < 0 || next >= steps.length) return;
    setNav({ index: next, dir: next > current ? 1 : -1 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const roundSteps = steps.filter((s) => s.round === step.round);
  const posInRound = roundSteps.indexOf(step) + 1;
  const regionSteps = step.region ? roundSteps.filter((s) => s.region === step.region) : roundSteps;
  const posInRegion = regionSteps.indexOf(step) + 1;
  const nextStep = steps[current + 1];
  const roundDone = roundSteps.every((s) => stepComplete(s, picks));

  // Hybrid auto-advance: move on only when this tap completed a card that was incomplete (first fill),
  // and only within the same round. Edits to finished cards stay put.
  const handleTap = (game: GameSlot, teamId: string) => {
    const wasComplete = stepComplete(step, picks);
    const { result, picks: next } = onTap(game, teamId);
    if (result === "full" || wasComplete || !stepComplete(step, next)) return;
    if (nextStep && nextStep.round === step.round) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => go(current + 1), 450);
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80 || info.velocity.x < -500) go(current + 1);
    else if (info.offset.x > 80 || info.velocity.x > 500) go(current - 1);
  };

  const rule = SCORING_RULES.find((r) => r.round === step.round)!;
  const title =
    step.round === 1
      ? `Pod ${posInRegion} of ${regionSteps.length}`
      : step.round <= 4
        ? `${ROUND_LABELS[step.round]} · ${gameLabel(step.games[0])}`
        : step.round === 5
          ? `Final Four · ${regions[(step.games[0].number - 1) * 2]} vs ${regions[(step.games[0].number - 1) * 2 + 1]}`
          : "Championship";

  return (
    <div className="space-y-4">
      {/* Round pills */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
        {[1, 2, 3, 4, 5, 6].map((round) => {
          const rs = steps.filter((s) => s.round === round);
          const done = rs.filter((s) => stepComplete(s, picks)).length;
          const active = round === step.round;
          return (
            <button
              key={round}
              type="button"
              onClick={() => go(steps.indexOf(rs.find((s) => !stepComplete(s, picks)) ?? rs[0]))}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold",
                active ? "border-primary bg-primary text-primary-foreground" : done === rs.length ? "bg-emerald-50 text-emerald-700" : "bg-card"
              )}
            >
              {done === rs.length && !active && <Check className="h-3 w-3" strokeWidth={3} />}
              {ROUND_SHORT[round]}
              <span className={cn("font-normal", active ? "opacity-80" : "text-muted-foreground")}>
                {done}/{rs.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Region switcher (rounds 1–4) */}
      {step.region && (
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {regions.map((region) => {
            const rs = roundSteps.filter((s) => s.region === region);
            const done = rs.every((s) => stepComplete(s, picks));
            return (
              <button
                key={region}
                type="button"
                onClick={() => go(steps.indexOf(rs.find((s) => !stepComplete(s, picks)) ?? rs[0]))}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold",
                  step.region === region ? "bg-background shadow" : "text-muted-foreground"
                )}
              >
                {done && <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />}
                {region}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step.key}
          custom={direction}
          initial={{ x: direction * 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction * -60, opacity: 0 }}
          transition={{ duration: 0.18 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          dragDirectionLock
          onDragEnd={onDragEnd}
          className="touch-pan-y rounded-2xl border bg-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {[step.region, ROUND_LABELS[step.round]].filter(Boolean).join(" · ")}
              </p>
              <h2 className="text-lg font-bold">{title}</h2>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {rule.choices > 1 ? `Rank ${rule.choices} · ${rule.pointsPerChoice.join("/")}` : `${rule.pointsPerChoice[0]} pts`}
            </span>
          </div>

          <div className="space-y-4">
            {step.games.map((game, gi) => {
              const unlocked = isUnlocked(game, picks, byId);
              const eligible = eligibleTeams(game, picks).map(team);
              const roundOneWinners = game.round === 2 ? game.feeders.map((f) => picks.get(f)?.choices[0]).filter((t): t is string => !!t) : undefined;
              return (
                <div key={game.gameId}>
                  {step.games.length > 1 && <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{gameLabel(game)}</p>}
                  {unlocked ? (
                    <GamePicker
                      round={game.round}
                      eligible={eligible}
                      choices={picks.get(game.gameId)?.choices ?? []}
                      onTap={(teamId) => handleTap(game, teamId)}
                      onReorder={(order) => onReorder(game, order)}
                      roundOneWinners={roundOneWinners}
                    />
                  ) : (
                    <LockedNotice game={game} byId={byId} onGo={(gameId) => go(steps.findIndex((s) => s.games.some((g) => g.gameId === gameId)))} />
                  )}
                  {step.round === 1 && gi === 0 && (
                    <div className="my-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      Winners meet in Round 2 Game {Math.ceil(game.number / 2)}
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {roundDone && nextStep && nextStep.round !== step.round && posInRound === roundSteps.length && (
            <button
              type="button"
              onClick={() => go(current + 1)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white"
            >
              <Check className="h-4 w-4" strokeWidth={3} /> {ROUND_LABELS[step.round]} done. Start {ROUND_LABELS[nextStep.round]}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {step.round === 6 && <div className="mt-5 border-t pt-4">{finale}</div>}
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-40 -mx-4 border-t bg-background/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} className="flex h-11 w-11 items-center justify-center rounded-lg border disabled:opacity-40" aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={onUndo} disabled={!canUndo} className="flex h-11 items-center gap-1.5 rounded-lg border px-3 text-sm disabled:opacity-40">
            <Undo2 className="h-4 w-4" /> Undo
          </button>
          <div className="flex-1 text-center text-xs text-muted-foreground">
            {ROUND_SHORT[step.round]} · {posInRound} of {roundSteps.length}
          </div>
          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={current === steps.length - 1}
            className="flex h-11 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LockedNotice({ game, byId, onGo }: { game: GameSlot; byId: Map<string, GameSlot>; onGo: (gameId: string) => void }) {
  const feeders = game.feeders.map((f) => byId.get(f)!).filter(Boolean);
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-muted/60 px-4 py-6 text-center">
      <Lock className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">This game opens once you&apos;ve picked the two games that feed it.</p>
      <div className="flex flex-wrap justify-center gap-2">
        {feeders.map((f) => (
          <button key={f.gameId} type="button" onClick={() => onGo(f.gameId)} className="rounded-full border bg-card px-3 py-1 text-xs font-semibold">
            {[f.region, ROUND_LABELS[f.round], gameLabel(f)].filter(Boolean).join(" ")} →
          </button>
        ))}
      </div>
    </div>
  );
}
