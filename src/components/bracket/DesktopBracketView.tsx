"use client";

import { Fragment } from "react";
import { BracketSlot } from "./BracketSlot";
import { cn } from "@/lib/utils";
import { eligibleTeams, isUnlocked, type GameSlot, type Picks, type TapResult } from "@/lib/picker";
import type { PickerTeam } from "@/components/picker/game-picker";

type Region = string;

interface DesktopBracketViewProps {
  /** Regions in bracket order: [0] and [1] on the left (Final Four game 1), [2] and [3] on the right */
  regions: string[];
  picks: Picks;
  byId: Map<string, GameSlot>;
  team: (id: string) => PickerTeam;
  onTap: (game: GameSlot, teamId: string) => { result: TapResult; picks: Picks };
  onReorder: (game: GameSlot, order: string[]) => void;
}

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
  { round: 1, n: 8, label: "R64" },
  { round: 2, n: 4, label: "R32" },
  { round: 3, n: 2, label: "Sweet 16" },
  { round: 4, n: 1, label: "Elite 8" },
];

/* ── Single region bracket ─────────────────────────── */
function RegionBracket({ region, slot, mirrored }: { region: Region; slot: SlotRenderer; mirrored: boolean }) {
  const renderSlot = (round: number, game: number) => slot(`${region}-r${round}-g${game}`, mirrored);

  return (
    <div className="flex flex-col">
      {/* Region header */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="h-px flex-1 bg-slate-400" />
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 px-3">
          {region}
        </h3>
        <div className="h-px flex-1 bg-slate-400" />
      </div>

      {/* Round labels */}
      <div className={cn("flex items-center mb-1", mirrored && "flex-row-reverse")}>
        {ROUNDS_CFG.map(({ round, label }, i) => (
          <Fragment key={round}>
            <div
              className="text-[9px] text-slate-600 font-bold text-center shrink-0"
              style={{ width: SLOT_W }}
            >
              {label}
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

/* ── Main desktop bracket view ────────────────────── */
export function DesktopBracketView({ regions, picks, byId, team, onTap, onReorder }: DesktopBracketViewProps) {
  const slot: SlotRenderer = (gameId, mirrored = false) => {
    const game = byId.get(gameId)!;
    return (
      <BracketSlot
        key={gameId}
        game={game}
        eligible={eligibleTeams(game, picks).map(team)}
        choices={picks.get(gameId)?.choices ?? []}
        unlocked={isUnlocked(game, picks, byId)}
        team={team}
        onTap={(teamId) => onTap(game, teamId)}
        onReorder={(order) => onReorder(game, order)}
        mirrored={mirrored}
      />
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="min-w-[1200px] p-4">
        {/* Top half: regions[0] (L→R)  ·  regions[2] (R←L) */}
        <div className="flex items-start justify-between">
          <RegionBracket region={regions[0]} slot={slot} mirrored={false} />
          <RegionBracket region={regions[2]} slot={slot} mirrored={true} />
        </div>

        {/* Center row: FF game 1 (left regions) · Championship · FF game 2 (right regions) */}
        <div className="-mt-14 flex items-center justify-center gap-6 py-4">
          <div className="flex flex-col items-center">
            <div className="mb-1 text-[10px] font-bold text-slate-700">Final Four</div>
            <div className="mb-1 text-[9px] text-slate-500">
              {regions[0]} vs {regions[1]}
            </div>
            {slot("final-four-r5-g1")}
          </div>

          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-primary bg-white px-8 py-4 shadow ring-2 ring-team-secondary ring-offset-2">
            <div className="text-lg font-extrabold tracking-wide text-primary">CHAMPION</div>
            <div className="text-[10px] font-bold text-slate-600">35 / 25 / 15 / 10 / 5 pts</div>
            {slot("championship-r6-g1")}
          </div>

          <div className="flex flex-col items-center">
            <div className="mb-1 text-[10px] font-bold text-slate-700">Final Four</div>
            <div className="mb-1 text-[9px] text-slate-500">
              {regions[2]} vs {regions[3]}
            </div>
            {slot("final-four-r5-g2", true)}
          </div>
        </div>

        {/* Bottom half: regions[1] (L→R)  ·  regions[3] (R←L) */}
        <div className="-mt-14 flex items-start justify-between">
          <RegionBracket region={regions[1]} slot={slot} mirrored={false} />
          <RegionBracket region={regions[3]} slot={slot} mirrored={true} />
        </div>
      </div>
    </div>
  );
}
