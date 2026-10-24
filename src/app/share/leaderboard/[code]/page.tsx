"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Medal, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";

interface StandingsEntry {
  rank: number;
  name: string;
  bracketName: string;
  score: number;
  tiebreaker: number | null;
}

interface SharedStandings {
  poolName: string;
  entries: StandingsEntry[];
  totalPrize: number;
  totalEntries: number;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="font-medium text-muted-foreground">{rank}</span>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function BrandBar() {
  return (
    <header className="border-b-[3px] border-b-team-secondary bg-background/95">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:h-16">
        <Link href="/" className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">
            Pick<span className="text-team-secondary">N</span>Roll
          </span>
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link href="/register">Join the pool</Link>
        </Button>
      </div>
    </header>
  );
}

export default function SharedStandingsPage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<SharedStandings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/share/leaderboard/${code}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok) setData(body);
        else setError(body.error || "Standings not found");
      })
      .catch(() => setError("Couldn't load the standings"))
      .finally(() => setIsLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-background">
      <BrandBar />
      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : error || !data ? (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="mb-2 text-xl font-semibold">Standings not found</h2>
          <p className="mb-6 text-muted-foreground">{error || "This share link is invalid or has expired."}</p>
          <Button asChild>
            <Link href="/">Go to Pick N Roll</Link>
          </Button>
        </div>
      ) : (
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
          <PageHeader title={data.poolName} description="Standings · official results, updated after each game" />

          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Users} label="Entries" value={data.totalEntries} />
            <Stat icon={Trophy} label="Prize pool" value={`$${data.totalPrize.toFixed(2)}`} />
          </div>

          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {data.entries.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-semibold">No entries yet</h3>
                <p className="text-sm text-muted-foreground">Standings fill in once brackets are submitted and games begin.</p>
              </div>
            ) : (
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 px-3">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Bracket</TableHead>
                    <TableHead className="hidden w-24 text-right md:table-cell">Tiebreaker</TableHead>
                    <TableHead className="w-16 px-3 text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry, idx) => (
                    <TableRow key={`${entry.name}-${entry.bracketName}-${idx}`}>
                      <TableCell className="px-3">
                        <div className="flex h-6 w-6 items-center justify-center">
                          <RankIcon rank={entry.rank} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="truncate">{entry.name}</div>
                        <div className="truncate text-xs font-normal text-muted-foreground md:hidden">{entry.bracketName}</div>
                      </TableCell>
                      <TableCell className="hidden truncate md:table-cell">{entry.bracketName}</TableCell>
                      <TableCell className="hidden text-right text-muted-foreground md:table-cell">{entry.tiebreaker ?? "–"}</TableCell>
                      <TableCell className="px-3 text-right font-bold tabular-nums text-primary">{entry.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <div className="py-4 text-center">
            <p className="mb-3 text-sm text-muted-foreground">Want in next season?</p>
            <Button asChild>
              <Link href="/register">Create an account</Link>
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}
