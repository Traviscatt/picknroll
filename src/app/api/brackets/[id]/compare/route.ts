import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { compareBrackets, summarizeBracket } from "@/lib/bracket-summary";
import { parsePicksData } from "@/lib/scoring-engine";
import { eliminatedTeams, loadTournamentResults, rankPool, SCORED_STATUSES } from "@/lib/scoring-service";
import { loadRegions } from "@/lib/tournament-service";

// GET /api/brackets/[id]/compare - This bracket vs. the pool leader (or the runner-up when it leads),
// once picks are locked. Same access as viewing the bracket: owner, site admin, or a member of its pool.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const bracket = await db.bracket.findFirst({
    where: { id, status: { in: SCORED_STATUSES } },
    select: { id: true, userId: true, picksData: true, poolId: true, pool: { select: { tournamentId: true, deadline: true } } },
  });
  if (!bracket?.poolId || !bracket.pool) return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  const allowed =
    bracket.userId === session.user.id ||
    session.user.role === "ADMIN" ||
    !!(await db.poolMember.findFirst({ where: { userId: session.user.id, poolId: bracket.poolId }, select: { id: true } }));
  if (!allowed) return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  if (new Date() <= bracket.pool.deadline) return NextResponse.json({ error: "Comparisons open once picks lock" }, { status: 403 });

  const [results, regions] = await Promise.all([loadTournamentResults(bracket.pool.tournamentId), loadRegions(bracket.pool.tournamentId)]);
  const ranking = await rankPool(bracket.poolId, results.actualTiebreaker);
  const opponentId = ranking.ranked.find((b) => b.id !== bracket.id)?.id;
  if (!opponentId) return NextResponse.json({ error: "Nobody to compare with yet" }, { status: 404 });
  const opponent = await db.bracket.findUniqueOrThrow({ where: { id: opponentId }, select: { id: true, name: true, entryName: true, picksData: true } });

  const eliminated = eliminatedTeams(results);
  const [mine, theirs] = [parsePicksData(bracket.picksData), parsePicksData(opponent.picksData)];
  const [me, them] = [summarizeBracket(mine, results.winners, eliminated, regions), summarizeBracket(theirs, results.winners, eliminated, regions)];
  const myRank = ranking.ranks.get(bracket.id) ?? null;
  return NextResponse.json({
    role: myRank === 1 ? "runner-up" : "leader",
    me: { rank: myRank, score: me.score, max: me.max, champion: me.champion },
    opponent: {
      bracketId: opponent.id,
      name: opponent.entryName,
      bracketName: opponent.name,
      rank: ranking.ranks.get(opponent.id) ?? null,
      score: them.score,
      max: them.max,
      champion: them.champion,
    },
    ...compareBrackets(mine, theirs, results.winners, eliminated),
  });
}
