"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Plus, Radio, Settings, Trophy } from "lucide-react";
import { Hero, HeroAction } from "@/components/shared/hero";
import { ordinal } from "@/components/game-center/parts";
import { OPEN_RULES_EVENT } from "@/components/shared/scoring-rules";
import { ROUND_LABELS } from "@/lib/live";
import { paymentDetails } from "@/lib/payment";
import { bracketActions, formatDeadline, nextStep, timeLeft, type SeasonEntry, type SeasonPool } from "@/lib/season";
import type { FieldLookup } from "@/lib/tournament-field";
import type { PodiumSpot } from "@/lib/hall-of-fame";

/** Current time, refreshed every `ms` (countdowns) */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

/** Entries that are submitted and paid (or payment reported) */
export const readyCount = (entries: SeasonEntry[]) => entries.filter((e) => e.status !== "DRAFT" && (e.paid || e.paymentPending)).length;

/** No pool: join with an invite code */
export function JoinHero() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <Hero
      label="Get in the game"
      value="Join a pool"
      size="md"
      caption="with the invite code from your pool admin"
      stats={[
        { value: "1 · Join", label: "with an invite code" },
        { value: "2 · Pick", label: "every tournament game" },
        { value: "3 · Pay", label: "Venmo or PayPal" },
      ]}
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) router.push(`/join?code=${encodeURIComponent(code.trim().toUpperCase())}`);
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Invite code"
          aria-label="Invite code"
          autoCapitalize="characters"
          className="h-10 min-w-0 flex-1 rounded-lg bg-card px-3 font-mono text-sm font-semibold tracking-wider text-foreground uppercase outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground placeholder:normal-case focus-visible:ring-2 focus-visible:ring-frame-accent"
        />
        <button type="submit" disabled={!code.trim()} className="h-10 shrink-0 rounded-lg border border-white/35 px-4 text-sm font-semibold disabled:opacity-50">
          Join
        </button>
      </form>
    </Hero>
  );
}

/** Before the field is set: the next season and last year's champion */
export function PreseasonHero({ year, pool, champion, championYear }: { year: number | null; pool: SeasonPool; champion: PodiumSpot | null; championYear: number | null }) {
  return (
    <Hero
      label={`${year ?? "Next"} season`}
      value="Selection Sunday"
      size="md"
      caption="brackets open once the field is set"
      side={{ value: pool.members, caption: pool.members === 1 ? "member" : "members" }}
      stats={[
        { value: champion?.name ?? "–", label: championYear ? `${championYear} champion` : "reigning champion" },
        { value: champion?.score != null ? `${champion.score} pts` : "–", label: "winning score" },
        { value: paymentDetails(pool).feeLabel, label: "per entry" },
      ]}
      actions={
        <>
          <HeroAction href="/hall-of-fame">
            <Crown className="h-4 w-4" /> Hall of Fame
          </HeroAction>
          <HeroAction href="/settings" variant="outline">
            <Settings className="h-4 w-4" /> Pick your team
          </HeroAction>
        </>
      }
    />
  );
}

/** Before the deadline: countdown and how many entries are ready */
export function EntryHero({ pool, entries }: { pool: SeasonPool; entries: SeasonEntry[] }) {
  const now = useNow();
  const left = timeLeft(pool.deadline, now);
  const locked = bracketActions({ status: "DRAFT", pool }, now).locked;
  const canAdd = pool.status === "OPEN" && !locked;
  const urgent = entries.map((e) => nextStep(e, locked)).find((s) => s.primary);
  const submitted = entries.filter((e) => e.status !== "DRAFT").length;
  const paid = entries.filter((e) => e.paid || e.paymentPending).length;
  const picked = entries.reduce((n, e) => n + e.picked, 0);
  const total = entries.reduce((n, e) => n + e.totalGames, 0);

  return (
    <Hero
      label="Picks lock in"
      value={left ?? "a moment"}
      size="md"
      caption={`${formatDeadline(pool.deadline)} · first tip-off`}
      side={entries.length ? { value: `${readyCount(entries)}/${entries.length}`, caption: "entries ready" } : { value: pool.entries, caption: "entries in the pool" }}
      stats={
        entries.length
          ? [
              { value: total ? `${picked}/${total}` : "–", label: "games picked" },
              { value: `${submitted} of ${entries.length}`, label: "submitted" },
              { value: `${paid} of ${entries.length}`, label: "paid" },
            ]
          : [
              { value: pool.members, label: pool.members === 1 ? "member" : "members" },
              { value: paymentDetails(pool).feeLabel, label: "per entry" },
              { value: "0", label: "your entries" },
            ]
      }
      actions={
        <>
          {urgent ? (
            <HeroAction href={urgent.href}>{urgent.label}</HeroAction>
          ) : (
            canAdd && (
              <HeroAction href="/brackets/new">
                <Plus className="h-4 w-4" /> {entries.length ? "New bracket" : "Start your bracket"}
              </HeroAction>
            )
          )}
          {urgent && canAdd ? (
            <HeroAction href="/brackets/new" variant="outline">
              <Plus className="h-4 w-4" /> New bracket
            </HeroAction>
          ) : (
            <HeroAction href="#rules" onClick={() => window.dispatchEvent(new Event(OPEN_RULES_EVENT))} variant="outline">
              How scoring works
            </HeroAction>
          )}
        </>
      }
    />
  );
}

/** During the tournament without a submitted bracket */
export function FollowAlongHero({ round }: { round: string | null }) {
  return (
    <Hero
      label={round ?? "The tournament is on"}
      value="Follow along"
      size="md"
      caption="you don't have a submitted bracket this season"
      actions={
        <>
          <HeroAction href="/game-center">
            <Radio className="h-4 w-4" /> Game Center
          </HeroAction>
          <HeroAction href="/leaderboard" variant="outline">
            <Trophy className="h-4 w-4" /> Standings
          </HeroAction>
        </>
      }
    />
  );
}

/** After the championship: your best finish and the champion */
export function CompleteHero({
  year,
  best,
  poolEntries,
  champion,
  lookup,
}: {
  year: number | null;
  best: SeasonEntry | null;
  poolEntries: number;
  champion: PodiumSpot | null;
  lookup: FieldLookup;
}) {
  const summary = best?.summary ?? null;
  const champ = summary?.champion ?? null;
  const topRound = summary ? [...summary.rounds].sort((a, b) => b.earned - a.earned || b.round - a.round)[0] : null;
  const label = `${year ? `${year} season` : "Season"} · Final`;
  const actions = (
    <>
      <HeroAction href="/hall-of-fame">
        <Crown className="h-4 w-4" /> Hall of Fame
      </HeroAction>
      <HeroAction href="/leaderboard" variant="outline">
        Final standings
      </HeroAction>
    </>
  );
  const championLine = champion && (
    <p className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
      <Trophy className="h-4 w-4 shrink-0 text-yellow-300" />
      <span className="min-w-0 flex-1 truncate">
        Champion: <span className="font-bold">{champion.name}</span>
      </span>
      {champion.score != null && <span className="shrink-0 font-semibold tabular-nums">{champion.score} pts</span>}
    </p>
  );

  if (!best || !summary) {
    return (
      <Hero label={label} value="That's a wrap" size="md" caption="the championship is final" actions={actions}>
        {championLine}
      </Hero>
    );
  }
  return (
    <Hero
      label={`${label} · ${best.name}`}
      value={best.rank ? ordinal(best.rank) : "–"}
      caption={`of ${poolEntries}`}
      side={{ value: summary.score, caption: "final pts" }}
      stats={[
        { value: champ ? `${lookup.name(champ.team)}${champ.state === "won" ? " ✓" : ""}` : "–", label: champ?.state === "won" ? "your champion won" : "your champion pick" },
        { value: `${summary.finalFour.filter((t) => t.state === "won").length} of 4`, label: "Final Four hits" },
        { value: topRound && topRound.earned ? `${ROUND_LABELS[topRound.round]}` : "–", label: topRound?.earned ? `best round · ${topRound.earned} pts` : "best round" },
      ]}
      actions={actions}
    >
      {best.rank === 1 ? (
        <p className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-yellow-300" /> You won the pool!
        </p>
      ) : (
        championLine
      )}
    </Hero>
  );
}
