"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, CheckCircle, Save, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ROUNDS = [
  { id: 1, name: "Round of 64", games: 32 },
  { id: 2, name: "Round of 32", games: 16 },
  { id: 3, name: "Sweet 16", games: 8 },
  { id: 4, name: "Elite 8", games: 4 },
  { id: 5, name: "Final Four", games: 2 },
  { id: 6, name: "Championship", games: 1 },
];

interface GameTeam {
  id: string;
  seed: number;
  region: string;
  team: { name: string; shortName: string };
}

interface Game {
  id: string;
  round: number;
  gameNumber: number;
  region: string | null;
  status: string;
  team1: GameTeam | null;
  team2: GameTeam | null;
  winner: GameTeam | null;
  winnerId: string | null;
  team1Score: number | null;
  team2Score: number | null;
}

interface LocalResult {
  winnerId: string | null;
  team1Score: string;
  team2Score: string;
}

export default function AdminResultsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentRound, setCurrentRound] = useState("1");
  const [games, setGames] = useState<Game[]>([]);
  const [localResults, setLocalResults] = useState<Map<string, LocalResult>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actualTiebreaker, setActualTiebreaker] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch("/api/admin/results");
        if (response.ok) {
          const data = await response.json();
          setGames(data.games || []);
          // Initialize local results from existing data
          const map = new Map<string, LocalResult>();
          for (const game of data.games || []) {
            map.set(game.id, {
              winnerId: game.winnerId,
              team1Score: game.team1Score?.toString() || "",
              team2Score: game.team2Score?.toString() || "",
            });
          }
          setLocalResults(map);
        }
      } catch (error) {
        console.error("Failed to fetch games:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchGames();
  }, [session]);

  const getGamesForRound = (round: number) => {
    return games.filter((g) => g.round === round).sort((a, b) => a.gameNumber - b.gameNumber);
  };

  const setWinner = (gameId: string, winnerId: string) => {
    const existing = localResults.get(gameId) || { winnerId: null, team1Score: "", team2Score: "" };
    const newMap = new Map(localResults);
    newMap.set(gameId, { ...existing, winnerId: existing.winnerId === winnerId ? null : winnerId });
    setLocalResults(newMap);
  };

  const setScore = (gameId: string, field: "team1Score" | "team2Score", value: string) => {
    const existing = localResults.get(gameId) || { winnerId: null, team1Score: "", team2Score: "" };
    const newMap = new Map(localResults);
    newMap.set(gameId, { ...existing, [field]: value });
    setLocalResults(newMap);
  };

  const handleSaveResults = async () => {
    setIsSaving(true);
    try {
      const results = Array.from(localResults.entries()).map(([gameId, result]) => ({
        gameId,
        winnerId: result.winnerId,
        team1Score: result.team1Score || null,
        team2Score: result.team2Score || null,
      }));

      const response = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, actualTiebreaker: actualTiebreaker || null }),
      });

      if (!response.ok) throw new Error("Failed to save");

      const data = await response.json();
      toast.success(data.message);
    } catch {
      toast.error("Failed to save results");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculateScores = async () => {
    setIsScoring(true);
    try {
      const response = await fetch("/api/admin/score", { method: "POST" });
      if (!response.ok) throw new Error("Failed to score");
      const data = await response.json();
      toast.success(data.message);
    } catch {
      toast.error("Failed to recalculate scores");
    } finally {
      setIsScoring(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return null;

  const completedGames = Array.from(localResults.values()).filter((r) => r.winnerId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Enter Results</h1>
            <p className="text-slate-600">
              {games.length > 0
                ? `${completedGames} of ${games.length} games have winners`
                : "No games in database yet. Add tournament data first."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRecalculateScores}
            disabled={isScoring}
          >
            {isScoring ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalculate Scores
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleSaveResults}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Results"}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Click a team to mark them as the winner. Optionally enter scores.
            Click &quot;Save Results&quot; to persist, then &quot;Recalculate Scores&quot; to update all bracket scores.
          </p>
        </CardContent>
      </Card>

      {/* Round Tabs */}
      <Tabs value={currentRound} onValueChange={setCurrentRound}>
        <TabsList className="grid w-full grid-cols-6">
          {ROUNDS.map((round) => (
            <TabsTrigger key={round.id} value={round.id.toString()}>
              R{round.id}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROUNDS.map((round) => {
          const roundGames = getGamesForRound(round.id);
          return (
            <TabsContent key={round.id} value={round.id.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    {round.name}
                  </CardTitle>
                  <CardDescription>
                    {roundGames.length} {roundGames.length === 1 ? "game" : "games"} in database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {roundGames.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Trophy className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No games for this round yet.</p>
                      <p className="text-sm mt-1">Tournament games need to be added to the database first.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {roundGames.map((game) => {
                        const local = localResults.get(game.id);
                        const isTeam1Winner = local?.winnerId === game.team1?.id;
                        const isTeam2Winner = local?.winnerId === game.team2?.id;

                        return (
                          <div
                            key={game.id}
                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-slate-500">
                                  {game.region ? `${game.region} - ` : ""}Game {game.gameNumber}
                                </p>
                                {(isTeam1Winner || isTeam2Winner) && (
                                  <Badge className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Winner set
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Team 1 */}
                                <div className="space-y-2">
                                  <Button
                                    variant={isTeam1Winner ? "default" : "outline"}
                                    className={`w-full justify-start h-auto py-3 ${
                                      isTeam1Winner ? "bg-green-500 hover:bg-green-600 text-white" : ""
                                    }`}
                                    onClick={() => game.team1 && setWinner(game.id, game.team1.id)}
                                    disabled={!game.team1}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                                        {game.team1?.seed ?? "?"}
                                      </span>
                                      <span>{game.team1?.team.name ?? "TBD"}</span>
                                    </div>
                                  </Button>
                                  <Input
                                    type="number"
                                    placeholder="Score"
                                    className="w-24"
                                    value={local?.team1Score || ""}
                                    onChange={(e) => setScore(game.id, "team1Score", e.target.value)}
                                  />
                                </div>
                                {/* Team 2 */}
                                <div className="space-y-2">
                                  <Button
                                    variant={isTeam2Winner ? "default" : "outline"}
                                    className={`w-full justify-start h-auto py-3 ${
                                      isTeam2Winner ? "bg-green-500 hover:bg-green-600 text-white" : ""
                                    }`}
                                    onClick={() => game.team2 && setWinner(game.id, game.team2.id)}
                                    disabled={!game.team2}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                                        {game.team2?.seed ?? "?"}
                                      </span>
                                      <span>{game.team2?.team.name ?? "TBD"}</span>
                                    </div>
                                  </Button>
                                  <Input
                                    type="number"
                                    placeholder="Score"
                                    className="w-24"
                                    value={local?.team2Score || ""}
                                    onChange={(e) => setScore(game.id, "team2Score", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Championship Tiebreaker */}
      {currentRound === "6" && (
        <Card>
          <CardHeader>
            <CardTitle>Championship Final Score</CardTitle>
            <CardDescription>
              Enter the actual combined score to determine tiebreakers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Actual Combined Score</label>
                <Input
                  type="number"
                  placeholder="e.g., 145"
                  className="w-32"
                  value={actualTiebreaker}
                  onChange={(e) => setActualTiebreaker(e.target.value)}
                />
              </div>
              <p className="text-sm text-slate-500 mt-6">
                This will be compared against each bracket&apos;s tiebreaker prediction.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
