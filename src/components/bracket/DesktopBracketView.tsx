"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BracketResultSlot, BracketSlot } from "./BracketSlot";
import { cn } from "@/lib/utils";
import { eligibleTeams, isUnlocked, pointsFor, type GameSlot, type Picks, type TapResult } from "@/lib/picker";
import type { PickerTeam } from "@/components/picker/game-picker";

type Region = string;

/** Read-only mode: results to mark picks against */
export interface BracketResults {
  /** Bracket game ID → winning team ID, for final games */
  winners: Map<string, string>;
  /** Teams that have lost a game */
  eliminated: Set<string>;
  /** Pool pick shares per game, keyed "rank index:teamId" */
  pct?: Record<string, Record<string, number>>;
}

type DesktopBracketViewProps = {
  /** Regions in bracket order: [0] and [1] on the left (Final Four game 1), [2] and [3] on the right */
  regions: string[];
  picks: Picks;
  byId: Map<string, GameSlot>;
  team: (id: string) => PickerTeam;
} & (
  | { results?: undefined; onTap: (game: GameSlot, teamId: string) => { result: TapResult; picks: Picks }; onReorder: (game: GameSlot, order: string[]) => void }
  | { results: BracketResults; onTap?: undefined; onReorder?: undefined }
);

type SlotRenderer = (gameId: string, mirrored?: boolean) => React.ReactNode;

/* ── Layout constants ─────────────────────────────── */
const R1_H = 62;
const SL_H = 28;
const R1_GAP = 4;
const CONN_W = 16;
const SLOT_W = 130;

const r1Y = Array.from({ length: 8 }, (_, i) => i * (R1_H + R1_GAP) + R1_H / 2);
const r2Y = Array.from({ length: 4 }, (_, i) => (r1Y[i * 2] + r1Y[i * 2 + 1]) / 2);
const s16Y = Array.from({ length: 2 }, (_, i) => (r2Y[i * 2] + r2Y[i * 2 + 1]) / 2);
const e8Y = [(s16Y[0] + s16Y[1]) / 2];
const COL_H = 8 * R1_H + 7 * R1_GAP;
const CENTERS = [r1Y, r2Y, s16Y, e8Y];

const COL_CFG = [
  { pt: 0, gap: R1_GAP, h: R1_H },
  { pt: r2Y[0] - SL_H / 2, gap: r2Y[1] - r2Y[0] - SL_H, h: SL_H },
  { pt: s16Y[0] - SL_H / 2, gap: s16Y[1] - s16Y[0] - SL_H, h: SL_H },
  { pt: e8Y[0] - SL_H / 2, gap: 0, h: SL_H },
];

/* ── SVG connector lines between rounds ───────────── */
function Connectors({
  from,
  to,
  mirrored,
}: {
  from: number[];
  to: number[];
  mirrored: boolean;
}) {
  const W = CONN_W;
  const m = W / 2;
  const x0 = mirrored ? W : 0;
  const x1 = mirrored ? 0 : W;

  return (
    <svg
      width={W}
      height={COL_H}
      className="shrink-0 block"
      style={{ minHeight: COL_H }}
    >
      {to.map((ty, i) => {
        const t = from[i * 2];
        const b = from[i * 2 + 1];
        return (
          <g key={i} stroke="#64748b" strokeWidth="1.5" fill="none">
            <line x1={x0} y1={t} x2={m} y2={t} />
            <line x1={x0} y1={b} x2={m} y2={b} />
            <line x1={m} y1={t} x2={m} y2={b} />
            <line x1={m} y1={ty} x2={x1} y2={ty} />
          </g>
        );
      })}
    </svg>
  );
}

/* ── Round configs ─────────────────────────────────── */
const ROUNDS_CFG = [
  { round: 1, n: 8, label: "R64", name: "Round 1" },
  { round: 2, n: 4, label: "R32", name: "Round 2" },
  { round: 3, n: 2, label: "Sweet 16", name: "Sweet 16" },
  { round: 4, n: 1, label: "Elite 8", name: "Elite 8" },
];

/* ── Single region bracket ─────────────────────────── */
function RegionBracket({ region, slot, mirrored, slotW, withPoints }: { region: Region; slot: SlotRenderer; mirrored: boolean; slotW: number; withPoints: boolean }) {
  const renderSlot = (round: number, game: number) => slot(`${region}-r${round}-g${game}`, mirrored);

  return (
    <div className="flex flex-col">
      {/* Region header */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="h-px flex-1 bg-border" />
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-foreground px-3">
          {region}
        </h3>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Round labels */}
      <div className={cn("flex items-center mb-1", mirrored && "flex-row-reverse")}>
        {ROUNDS_CFG.map(({ round, label, name }, i) => (
          <Fragment key={round}>
            <div
              className={cn("text-center shrink-0 font-bold text-muted-foreground", withPoints ? "text-[10px]" : "text-[9px]")}
              style={{ width: slotW }}
            >
              {withPoints ? `${name} · ${pointsFor(round).join("/")} pts` : label}
            </div>
            {i < ROUNDS_CFG.length - 1 && (
              <div style={{ width: CONN_W }} className="shrink-0" />
            )}
          </Fragment>
        ))}
      </div>

      {/* Bracket body */}
      <div
        className={cn("flex", mirrored && "flex-row-reverse")}
        style={{ height: COL_H }}
      >
        {ROUNDS_CFG.map(({ round, n }, ri) => {
          const cfg = COL_CFG[ri];
          return (
            <Fragment key={round}>
              <div
                className="flex flex-col shrink-0"
                style={{ paddingTop: cfg.pt, gap: cfg.gap }}
              >
                {Array.from({ length: n }, (_, j) => (
                  <div
                    key={j}
                    style={{ height: cfg.h }}
                    className="flex items-center"
                  >
                    {renderSlot(round, j + 1)}
                  </div>
                ))}
              </div>
              {ri < ROUNDS_CFG.length - 1 && (
                <Connectors
                  from={CENTERS[ri]}
                  to={CENTERS[ri + 1]}
                  mirrored={mirrored}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

const READ_ONLY_SLOT_W = 152;
const ZOOM_STEPS = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25];

/* ── Main desktop bracket view ────────────────────── */
export function DesktopBracketView(props: DesktopBracketViewProps) {
  const { regions, picks, byId, team } = props;
  const readOnly = !!props.results;
  const slotW = readOnly ? READ_ONLY_SLOT_W : SLOT_W;
  const [traced, setTraced] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [fitScale, setFitScale] = useState(1);
  const outer = useRef<HTMLDivElement>(null);
  const naturalW = 2 * (4 * slotW + 3 * CONN_W) + 48;

  useEffect(() => {
    if (!readOnly || !outer.current) return;
    const el = outer.current;
    const update = () => setFitScale(Math.min(1, (el.clientWidth - 2) / naturalW));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [readOnly, naturalW]);

  const scale = zoom === "fit" ? fitScale : zoom;
  const tracedGames = useMemo(() => {
    if (!traced) return null;
    return new Set([...picks.values()].filter((p) => (p.round === 1 ? p.choices[0] === traced : p.choices.includes(traced))).map((p) => p.gameId));
  }, [traced, picks]);
  const tracedWins = traced && props.results ? [...props.results.winners.values()].filter((w) => w === traced).length : 0;

  const slot: SlotRenderer = (gameId, mirrored = false) => {
    const game = byId.get(gameId)!;
    const choices = picks.get(gameId)?.choices ?? [];
    if (props.results) {
      return (
        <BracketResultSlot
          key={gameId}
          game={game}
          eligible={game.round === 1 ? eligibleTeams(game, picks).map(team) : []}
          choices={choices}
          team={team}
          winner={props.results.winners.get(gameId) ?? null}
          eliminated={props.results.eliminated}
          pct={props.results.pct?.[gameId]}
          mirrored={mirrored}
          traced={tracedGames?.has(gameId) ?? false}
          onTrace={(teamId) => setTraced((t) => (t === teamId ? null : teamId))}
        />
      );
    }
    const { onTap, onReorder } = props;
    return (
      <BracketSlot
        key={gameId}
        game={game}
        eligible={eligibleTeams(game, picks).map(team)}
        choices={choices}
        unlocked={isUnlocked(game, picks, byId)}
        team={team}
        onTap={(teamId) => onTap(game, teamId)}
        onReorder={(order) => onReorder(game, order)}
        mirrored={mirrored}
      />
    );
  };

  const stepZoom = (dir: 1 | -1) => {
    const current = zoom === "fit" ? fitScale : zoom;
    const next = dir > 0 ? ZOOM_STEPS.find((z) => z > current + 0.01) : [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01);
    if (next) setZoom(next);
  };

  return (
    <div className="w-full rounded-xl border bg-muted/40 shadow-sm">
      {readOnly && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3 rounded-t-xl">
          {[
            ["Right", "bg-hit-soft text-hit"],
            ["Wrong", "bg-miss-soft text-muted-foreground line-through"],
            ["Knocked out", "text-muted-foreground/60 line-through"],
            ["Still alive", "bg-card font-semibold"],
          ].map(([label, cls]) => (
            <span key={label} className={cn("rounded-md border px-2 py-0.5 text-xs", cls)}>
              {label}
            </span>
          ))}
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {traced ? (
              <>
                Tracing <span className="font-semibold text-foreground">{team(traced).name}</span>: {tracedWins} win{tracedWins === 1 ? "" : "s"} so far ·{" "}
                <button type="button" className="font-semibold text-primary" onClick={() => setTraced(null)}>
                  Clear
                </button>
              </>
            ) : (
              "Tap a team to trace its path · hover a pick for the pool %"
            )}
          </span>
          <span className="flex items-center gap-1 rounded-md border bg-card px-1 py-0.5 text-xs">
            <button type="button" onClick={() => stepZoom(-1)} className="rounded px-1.5 py-0.5 hover:bg-muted" aria-label="Zoom out">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setZoom("fit")} className={cn("rounded px-1.5 py-0.5 hover:bg-muted", zoom === "fit" && "font-semibold")}>
              {zoom === "fit" ? "Fit to screen" : `${Math.round(scale * 100)}%`}
            </button>
            <button type="button" onClick={() => stepZoom(1)} className="rounded px-1.5 py-0.5 hover:bg-muted" aria-label="Zoom in">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}
      <div ref={outer} className="w-full overflow-x-auto">
        <div
          className="p-4"
          style={readOnly ? ({ width: naturalW, zoom: scale, ["--slot-w" as string]: `${slotW}px` } as React.CSSProperties) : { minWidth: 1200 }}
        >
          {/* Top half: regions[0] (L→R)  ·  regions[2] (R←L) */}
          <div className="flex items-start justify-between">
            <RegionBracket region={regions[0]} slot={slot} mirrored={false} slotW={slotW} withPoints={readOnly} />
            <RegionBracket region={regions[2]} slot={slot} mirrored={true} slotW={slotW} withPoints={readOnly} />
          </div>

          {/* Center row: FF game 1 (left regions) · Championship · FF game 2 (right regions) */}
          <div className="-mt-14 flex items-center justify-center gap-6 py-4">
            <div className="flex flex-col items-center">
              <div className="mb-1 text-[10px] font-bold text-foreground/80">Final Four</div>
              <div className="mb-1 text-[9px] text-muted-foreground">
                {regions[0]} vs {regions[1]}
              </div>
              {slot("final-four-r5-g1")}
            </div>

            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-primary bg-card px-8 py-4 shadow ring-2 ring-team-secondary ring-offset-2">
              <div className="text-lg font-extrabold tracking-wide text-primary">CHAMPION</div>
              <div className="text-[10px] font-bold text-muted-foreground">{pointsFor(6).join(" / ")} pts</div>
              {slot("championship-r6-g1")}
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-1 text-[10px] font-bold text-foreground/80">Final Four</div>
              <div className="mb-1 text-[9px] text-muted-foreground">
                {regions[2]} vs {regions[3]}
              </div>
              {slot("final-four-r5-g2", true)}
            </div>
          </div>

          {/* Bottom half: regions[1] (L→R)  ·  regions[3] (R←L) */}
          <div className="-mt-2 flex items-start justify-between">
            <RegionBracket region={regions[1]} slot={slot} mirrored={false} slotW={slotW} withPoints={readOnly} />
            <RegionBracket region={regions[3]} slot={slot} mirrored={true} slotW={slotW} withPoints={readOnly} />
          </div>
        </div>
      </div>
    </div>
  );
}
