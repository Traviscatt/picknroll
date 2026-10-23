"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, TrendingUp, Users, Share2, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useStandingsMode } from "@/hooks/use-standings-mode";
import { useAnyLive, useLiveData } from "@/hooks/use-live-data";
import { Movement, StandingsToggle } from "@/components/game-center/parts";
import { isLive } from "@/lib/live";

interface LeaderboardEntry {
  rank: number;
  bracketId: string;
  name: string;
  bracketName: string;
  score: number;
  tiebreaker: number | null;
  paid: boolean;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  poolId: string | null;
  entries: LeaderboardEntry[];
  userRank: number | null;
  userScore: number | null;
  totalPrize: number;
  totalEntries: number;
  paidEntries: number;
  viewCode: string | null;
  actualTiebreaker: number | null;
}

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useStandingsMode();
  const anyLive = useAnyLive(!!session);
  const liveMode = mode === "live";
  const live = useLiveData(data?.poolId ?? null, null, liveMode && !!data?.poolId);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard");
        if (response.ok) {
          setData(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchLeaderboard();
  }, [session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  // Live mode: same rows ranked as if every in-progress game ended now
  const myIds = new Set((data?.entries ?? []).filter((e) => e.isCurrentUser).map((e) => e.bracketId));
  const officialById = new Map((data?.entries ?? []).map((e) => [e.bracketId, e]));
  const liveStandings = live.data?.standings ?? [];
  const leaderboard: (LeaderboardEntry & { move?: number; tonight?: number })[] =
    liveMode && liveStandings.length
      ? [...liveStandings]
          .sort((a, b) => a.liveRank - b.liveRank || a.name.localeCompare(b.name))
          .map((s) => ({
            rank: s.liveRank,
            bracketId: s.bracketId,
            name: s.name,
            bracketName: s.bracketName,
            score: s.live,
            tiebreaker: s.tiebreaker,
            paid: officialById.get(s.bracketId)?.paid ?? false,
            isCurrentUser: myIds.has(s.bracketId),
            move: s.officialRank - s.liveRank,
            tonight: s.live - s.official,
          }))
      : data?.entries ?? [];
  const showLive = liveMode && liveStandings.length > 0;
  const liveGames = (live.data?.games ?? []).filter(isLive);
  const myLive = liveStandings.find((s) => myIds.has(s.bracketId));
  
  const filteredLeaderboard = searchQuery.trim()
    ? leaderboard.filter(
        (entry) =>
          entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.bracketName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leaderboard;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-slate-500 font-medium">{rank}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leaderboard</h1>
          <p className="text-slate-600 mt-1">
            See how you stack up against the competition
          </p>
        </div>
        {data?.viewCode && (
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/share/leaderboard/${data.viewCode}`
              );
              toast.success("Share link copied!");
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        {/* Your Rank - always visible */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {showLive && myLive ? (
              <>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  {myLive.liveRank}
                  <Movement by={myLive.officialRank - myLive.liveRank} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {myLive.live} live pts · {myLive.official} official
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.userRank ?? "--"}</div>
                {data?.userScore !== null && data?.userScore !== undefined && (
                  <p className="text-sm text-muted-foreground">{data.userScore} pts</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Pool Stats - combined on mobile, separate on desktop */}
        <Card className="md:hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Stats</CardTitle>
            <div className="flex gap-1">
              <Users className="h-4 w-4 text-primary" />
              <Trophy className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalEntries ?? 0} entries</div>
            <p className="text-sm text-muted-foreground">
              ${(data?.totalPrize ?? 0).toFixed(2)}
              {data && data.totalEntries - data.paidEntries > 0 && (
                <span> ({data.totalEntries - data.paidEntries} unpaid)</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Desktop only: Total Entries */}
        <Card className="hidden md:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalEntries ?? 0}</div>
          </CardContent>
        </Card>

        {/* Desktop only: Prize Pool */}
        <Card className="hidden md:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data?.totalPrize ?? 0).toFixed(2)}
              {data && data.totalEntries - data.paidEntries > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({data.totalEntries - data.paidEntries} unpaid)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Standings</CardTitle>
            <CardDescription>
              {liveMode ? "Live projection: ranked as if every game in progress ended now" : "Final results only, updated after each game"}
              {data?.actualTiebreaker != null
                ? ` · Ties broken by closest tiebreaker to the actual championship total (${data.actualTiebreaker})`
                : " · Ties are broken by the tiebreaker once the championship is final"}
            </CardDescription>
          </div>
          <StandingsToggle mode={mode} onChange={setMode} liveAvailable={anyLive} className="w-full md:w-56" />
        </CardHeader>
        {liveMode && (
          <div className="mx-6 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
            <span>
              {liveGames.length
                ? `Live: ${liveGames.map((g) => `${g.teams[0].name}–${g.teams[1].name} (${g.state === "half" ? "Half" : g.detail})`).join(", ")}. Not official until games go final.`
                : live.loading
                  ? "Loading live scores…"
                  : "No games in progress right now, so live matches the official standings."}
            </span>
          </div>
        )}
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                The leaderboard will populate once brackets are submitted and games begin.
              </p>
            </div>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or bracket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {filteredLeaderboard.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No results found for &quot;{searchQuery}&quot;
                </div>
              ) : (
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 px-2">Rank</TableHead>
                    {showLive && <TableHead className="w-12 px-1">Move</TableHead>}
                    <TableHead className="max-w-[140px] truncate">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Bracket</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Tiebreaker</TableHead>
                    {showLive && <TableHead className="text-right hidden md:table-cell w-20">Tonight</TableHead>}
                    <TableHead className="text-right w-16 px-2">{showLive ? "Live" : "Score"}</TableHead>
                    <TableHead className="w-8 px-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaderboard.map((entry) => (
                  <TableRow
                    key={`${entry.name}-${entry.bracketName}`}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      entry.isCurrentUser
                        ? "bg-secondary hover:bg-secondary/80"
                        : ""
                    }`}
                    onClick={() => router.push(`/brackets/${entry.bracketId}`)}
                  >
                    <TableCell className="font-medium px-2">
                      <div className="flex items-center justify-center w-6 h-6">
                        {getRankIcon(entry.rank)}
                      </div>
                    </TableCell>
                    {showLive && (
                      <TableCell className="px-1">
                        <Movement by={entry.move ?? 0} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium max-w-[140px]">
                      <div className="truncate">
                        <div className="flex items-center gap-1 truncate">
                          <span className="truncate">{entry.name}</span>
                          {entry.isCurrentUser && (
                            <Badge variant="outline" className="text-primary border-primary text-xs shrink-0">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-normal md:hidden truncate">
                          {entry.bracketName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{entry.bracketName}</TableCell>
                    <TableCell className="text-right text-slate-500 hidden md:table-cell">
                      {entry.tiebreaker ?? "-"}
                    </TableCell>
                    {showLive && (
                      <TableCell className="text-right hidden md:table-cell">
                        <span className={(entry.tonight ?? 0) >= 15 ? "font-semibold text-green-600" : "text-muted-foreground"}>+{entry.tonight ?? 0}</span>
                      </TableCell>
                    )}
                    <TableCell className="text-right px-2 w-16">
                      <span className="font-bold text-primary">
                        {entry.score}
                      </span>
                    </TableCell>
                    <TableCell className="w-8 px-1">
                      <Eye className="h-4 w-4 text-slate-300" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
