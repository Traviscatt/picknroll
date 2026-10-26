import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentMembership } from "@/lib/pools";
import { loadRegions } from "@/lib/tournament-service";
import { bracketGames, progress, toPicks } from "@/lib/picker";
import { parsePicksData } from "@/lib/scoring-engine";
import { seasonPhase } from "@/lib/season";
import { summarizeBracket } from "@/lib/bracket-summary";
import { eliminatedTeams, loadTournamentResults, rankPool } from "@/lib/scoring-service";

// GET /api/season - Where the member's current season stands, plus their entries in it (Home)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await currentMembership(session.user.id);
  if (!membership) return NextResponse.json({ phase: "no-pool", pool: null, tournament: null, entries: [] });
  const { pool } = membership;

  const [tournament, teamCount, championship, regions, members, entryCount, brackets] = await Promise.all([
    db.tournament.findUnique({ where: { id: pool.tournamentId }, select: { year: true, startDate: true } }),
    db.tournamentTeam.count({ where: { tournamentId: pool.tournamentId } }),
    db.game.findFirst({ where: { tournamentId: pool.tournamentId, round: 6, status: "FINAL", winnerId: { not: null } }, select: { id: true } }),
    loadRegions(pool.tournamentId),
    db.poolMember.count({ where: { poolId: pool.id } }),
    db.bracket.count({ where: { poolId: pool.id, status: { in: ["SUBMITTED", "PAID"] } } }),
    db.bracket.findMany({
      where: { userId: session.user.id, poolId: pool.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        entryName: true,
        status: true,
        paid: true,
        totalScore: true,
        bonusScore: true,
        picksData: true,
        payments: { where: { status: "PENDING" }, take: 1, select: { id: true } },
      },
    }),
  ]);

  // Once picks lock, each entry also gets its standing: rank, points by round, champion / Final Four status
  const locked = new Date() > pool.deadline;
  const results = locked ? await loadTournamentResults(pool.tournamentId) : null;
  const ranking = results ? await rankPool(pool.id, results.actualTiebreaker) : null;
  const eliminated = results ? eliminatedTeams(results) : new Set<string>();

  const games = regions.length === 4 ? bracketGames(regions) : [];
  const entries = brackets.map(({ picksData, payments, ...b }) => {
    const picks = parsePicksData(picksData);
    const scored = results && b.status !== "DRAFT";
    return {
      ...b,
      paymentPending: !b.paid && payments.length > 0,
      picked: games.length ? progress(toPicks(picks), games).done : 0,
      totalGames: games.length,
      rank: scored ? ranking?.ranks.get(b.id) ?? null : null,
      summary: scored ? summarizeBracket(picks, results.winners, eliminated, regions) : null,
    };
  });

  return NextResponse.json({
    phase: seasonPhase({ now: new Date(), deadline: pool.deadline, fieldReady: teamCount > 0, championshipFinal: !!championship }),
    pool: {
      id: pool.id,
      name: pool.name,
      status: pool.status,
      deadline: pool.deadline,
      inviteCode: pool.inviteCode,
      entryFee: pool.entryFee.toString(),
      paypalLink: pool.paypalLink,
      venmoHandle: pool.venmoHandle,
      members,
      entries: entryCount,
      leaderScore: ranking?.ranked[0]?.score ?? null,
    },
    tournament: tournament ? { year: tournament.year, startDate: tournament.startDate } : null,
    entries,
  });
}
