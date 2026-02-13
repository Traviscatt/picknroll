"use client";

import { Fragment } from "react";
import { BracketSlot } from "./BracketSlot";
import { SCORING_RULES } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logo: string;
  record?: string;
}

interface GamePick {
  gameId: string;
  round: number;
  choices: string[];
}

type Region = "South" | "West" | "East" | "Midwest";

interface DesktopBracketViewProps {
  teams: Team[];
  picks: Map<string, GamePick>;
  onPick: (gameId: string, teamId: string, choiceRank: number) => void;
  getEligibleTeamsForGame: (round: number, region: Region, gameNum: number) => Team[];
  getFinalFourTeams: (semi: 1 | 2) => Team[];
  getChampionshipTeams: () => Team[];
}

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
function RegionBracket({
  region,
  picks,
  onPick,
  getEligibleTeamsForGame,
  mirrored,
}: {
  region: Region;
  picks: Map<string, GamePick>;
  onPick: (gameId: string, teamId: string, choiceRank: number) => void;
  getEligibleTeamsForGame: (round: number, region: Region, gameNum: number) => Team[];
  mirrored: boolean;
}) {
  const renderSlot = (round: number, game: number) => {
    const gameId = `${region}-r${round}-g${game}`;
    const pick = picks.get(gameId);
    const rule = SCORING_RULES.find((r) => r.round === round)!;
    const eligible = getEligibleTeamsForGame(round, region, game);
    return (
      <BracketSlot
        key={gameId}
        gameId={gameId}
        round={round}
        eligibleTeams={eligible}
        picks={pick?.choices || []}
        maxChoices={rule.choices}
        pointsPerChoice={rule.pointsPerChoice}
        onPick={onPick}
        mirrored={mirrored}
      />
    );
  };

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
export function DesktopBracketView({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  teams,
  picks,
  onPick,
  getEligibleTeamsForGame,
  getFinalFourTeams,
  getChampionshipTeams,
}: DesktopBracketViewProps) {
  const renderCenterSlot = (gameId: string, round: number, eligible: Team[]) => {
    const pick = picks.get(gameId);
    const rule = SCORING_RULES.find((r) => r.round === round)!;
    return (
      <BracketSlot
        gameId={gameId}
        round={round}
        eligibleTeams={eligible}
        picks={pick?.choices || []}
        maxChoices={rule.choices}
        pointsPerChoice={rule.pointsPerChoice}
        onPick={onPick}
      />
    );
  };

  return (
    <div className="w-full overflow-x-auto bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
      <div className="min-w-[1200px] p-4">

        {/* Top half: South (L→R)  ·  East (R←L) */}
        <div className="flex justify-between items-start">
          <RegionBracket
            region="South"
            picks={picks}
            onPick={onPick}
            getEligibleTeamsForGame={getEligibleTeamsForGame}
            mirrored={false}
          />

          <RegionBracket
            region="East"
            picks={picks}
            onPick={onPick}
            getEligibleTeamsForGame={getEligibleTeamsForGame}
            mirrored={true}
          />
        </div>

        {/* Center row: FF(South vs West) · Championship · FF(East vs Midwest) */}
        <div className="flex items-center justify-center gap-6 py-4 -mt-14">
          {/* FF Game 1: South vs West */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-slate-700 mb-1 font-bold">Final Four</div>
            <div className="text-[9px] text-slate-500 mb-1">South vs West</div>
            {renderCenterSlot("final-four-r5-g1", 5, getFinalFourTeams(1))}
          </div>

          {/* Championship */}
          <div className="flex flex-col items-center gap-2 bg-white border-2 border-primary rounded-xl px-8 py-4 shadow ring-2 ring-team-secondary ring-offset-2">
            <div className="text-lg font-extrabold text-primary tracking-wide">CHAMPION</div>
            <div className="text-[10px] text-slate-600 font-bold">35 / 25 / 15 / 10 / 5 pts</div>
            {renderCenterSlot("championship-r6-g1", 6, getChampionshipTeams())}
          </div>

          {/* FF Game 2: East vs Midwest */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-slate-700 mb-1 font-bold">Final Four</div>
            <div className="text-[9px] text-slate-500 mb-1">East vs Midwest</div>
            {renderCenterSlot("final-four-r5-g2", 5, getFinalFourTeams(2))}
          </div>
        </div>

        {/* Bottom half: West (L→R)  ·  Midwest (R←L) */}
        <div className="flex justify-between items-start -mt-14">
          <RegionBracket
            region="West"
            picks={picks}
            onPick={onPick}
            getEligibleTeamsForGame={getEligibleTeamsForGame}
            mirrored={false}
          />

          <RegionBracket
            region="Midwest"
            picks={picks}
            onPick={onPick}
            getEligibleTeamsForGame={getEligibleTeamsForGame}
            mirrored={true}
          />
        </div>
      </div>
    </div>
  );
}
