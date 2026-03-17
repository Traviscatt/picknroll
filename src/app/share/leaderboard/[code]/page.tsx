"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  rank: number;
  name: string;
  bracketName: string;
  score: number;
  tiebreaker: number | null;
}

interface SharedLeaderboardData {
  poolName: string;
  entries: LeaderboardEntry[];
  totalPrize: number;
  totalEntries: number;
}

export default function SharedLeaderboardPage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<SharedLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`/api/share/leaderboard/${code}`);
        if (response.ok) {
          setData(await response.json());
        } else {
          const errData = await response.json();
          setError(errData.error || "Leaderboard not found");
        }
      } catch {
        setError("Failed to load leaderboard");
      } finally {
        setIsLoading(false);
      }
    };
    if (code) fetchLeaderboard();
  }, [code]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold mb-2">Leaderboard Not Found</h2>
            <p className="text-slate-600 mb-6">
              {error || "This share link is invalid or has expired."}
            </p>
            <Button asChild>
              <Link href="/">Go to Pick N Roll</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-orange-500" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Pick N Roll</h1>
              <p className="text-xs text-slate-500">NCAA Tournament Pool</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/register">Join the Pool</Link>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Pool Name */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{data.poolName}</h2>
          <p className="text-slate-600 mt-1">Live Leaderboard</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
              <Trophy className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.totalPrize.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
            <CardDescription>Rankings updated after each game</CardDescription>
          </CardHeader>
          <CardContent>
            {data.entries.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
                <p className="text-slate-600">
                  The leaderboard will populate once brackets are submitted and games begin.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Bracket</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Tiebreaker</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry, idx) => (
                    <TableRow key={`${entry.name}-${entry.bracketName}-${idx}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(entry.rank)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.name}
                        {entry.rank <= 3 && (
                          <Badge
                            variant="outline"
                            className={
                              entry.rank === 1
                                ? "ml-2 border-yellow-500 text-yellow-600"
                                : entry.rank === 2
                                  ? "ml-2 border-slate-400 text-slate-500"
                                  : "ml-2 border-amber-600 text-amber-700"
                            }
                          >
                            {entry.rank === 1 ? "1st" : entry.rank === 2 ? "2nd" : "3rd"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{entry.bracketName}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-orange-600">{entry.score}</span>
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {entry.tiebreaker ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 mb-3">
            Want to join the competition?
          </p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/register">Create an Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
