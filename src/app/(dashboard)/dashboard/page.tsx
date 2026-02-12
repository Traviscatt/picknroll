"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Plus,
  Upload,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  ChevronRight,
  Clock,
  CheckCircle,
} from "lucide-react";

interface Bracket {
  id: string;
  name: string;
  entryName: string;
  status: "DRAFT" | "SUBMITTED" | "PAID";
  totalScore: number;
  paid: boolean;
  updatedAt: string;
  familyMember?: { id: string; name: string } | null;
}

interface Pool {
  id: string;
  name: string;
  inviteCode: string;
  entryFee: string;
  deadline: string;
  _count: { brackets: number };
  members: { userId: string; role: string; user: { name: string } }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bracketsRes, poolsRes] = await Promise.all([
          fetch("/api/brackets"),
          fetch("/api/pools"),
        ]);
        if (bracketsRes.ok) setBrackets(await bracketsRes.json());
        if (poolsRes.ok) setPools(await poolsRes.json());
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchData();
  }, [session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  const submittedCount = brackets.filter((b) => b.status === "SUBMITTED" || b.status === "PAID").length;
  const draftCount = brackets.filter((b) => b.status === "DRAFT").length;
  const bestScore = brackets.length > 0 ? Math.max(...brackets.map((b) => b.totalScore)) : 0;
  const hasPaidBracket = brackets.some((b) => b.paid);
  const currentPool = pools[0];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {session.user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-slate-600 mt-1">
            Manage your brackets and track your standings
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/brackets/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Bracket
            </Link>
          </Button>
          <Button asChild className="bg-[var(--team-primary)] hover:bg-[var(--team-secondary)]">
            <Link href="/brackets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Bracket
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Brackets</CardTitle>
            <Trophy className="h-4 w-4 text-[var(--team-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brackets.length}</div>
            <p className="text-xs text-muted-foreground">
              {submittedCount} submitted, {draftCount} drafts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-[var(--team-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bestScore}</div>
            <p className="text-xs text-muted-foreground">
              Max possible: 369
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool</CardTitle>
            <Users className="h-4 w-4 text-[var(--team-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPool ? currentPool.members.length : "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentPool ? `${currentPool.name}` : "Join a pool to compete"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-[var(--team-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5.00</div>
            <p className="text-xs text-muted-foreground">
              {hasPaidBracket ? (
                <Badge className="bg-green-500">Paid</Badge>
              ) : (
                <Badge variant="outline" className="text-[var(--team-primary)] border-[var(--team-primary)]">
                  Unpaid
                </Badge>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deadline Alert */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--team-primary)]" />
            <CardTitle className="text-lg">Submission Deadline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700">
            <span className="font-semibold">Thursday at 12:00 PM (Noon)</span> - Before the first tipoff
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Make sure your bracket is submitted and payment is complete before the deadline.
          </p>
        </CardContent>
      </Card>

      {/* My Brackets & Pool Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* My Brackets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[var(--team-primary)]" />
              My Brackets
            </CardTitle>
            <CardDescription>
              Your submitted and draft brackets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {brackets.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="mb-4">You haven&apos;t created any brackets yet</p>
                <Button asChild className="bg-[var(--team-primary)] hover:bg-[var(--team-secondary)]">
                  <Link href="/brackets/new">
                    Create Your First Bracket
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {brackets.slice(0, 5).map((bracket) => (
                  <Link key={bracket.id} href={`/brackets/${bracket.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{bracket.entryName}</p>
                        <p className="text-xs text-slate-500">{bracket.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--team-primary)]">{bracket.totalScore} pts</span>
                        <Badge
                          variant={bracket.status === "DRAFT" ? "outline" : "default"}
                          className={bracket.status === "SUBMITTED" ? "bg-blue-500" : bracket.status === "PAID" ? "bg-green-500" : ""}
                        >
                          {bracket.status === "DRAFT" && <Clock className="mr-1 h-3 w-3" />}
                          {bracket.status !== "DRAFT" && <CheckCircle className="mr-1 h-3 w-3" />}
                          {bracket.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
                {brackets.length > 5 && (
                  <Link href="/brackets" className="block text-center text-sm text-[var(--team-primary)] hover:underline pt-2">
                    View all {brackets.length} brackets
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pool Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--team-primary)]" />
              My Pool
            </CardTitle>
            <CardDescription>
              Pool membership and standings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentPool ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="mb-4">You&apos;re not in any pool yet</p>
                <Button asChild variant="outline">
                  <Link href="/join">
                    Join a Pool
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-semibold">{currentPool.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Invite code: <span className="font-mono font-medium">{currentPool.inviteCode}</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-2xl font-bold">{currentPool.members.length}</p>
                    <p className="text-xs text-slate-500">Members</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-2xl font-bold">{currentPool._count.brackets}</p>
                    <p className="text-xs text-slate-500">Brackets</p>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <p>Deadline: <span className="font-medium">{new Date(currentPool.deadline).toLocaleString()}</span></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How Scoring Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Our Scoring Works</CardTitle>
          <CardDescription>
            Our unique multi-choice system lets you hedge your bets in later rounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold mb-2">Rounds 1 & 2</h4>
              <p className="text-sm text-slate-600 mb-2">Traditional single picks</p>
              <div className="flex gap-2">
                <Badge>R1: 2 pts</Badge>
                <Badge>R2: 5 pts</Badge>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold mb-2">Sweet 16 & Elite 8</h4>
              <p className="text-sm text-slate-600 mb-2">Multi-choice picks</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">S16: 10/5 pts</Badge>
                <Badge variant="outline">E8: 15/10/5 pts</Badge>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold mb-2">Final Four & Championship</h4>
              <p className="text-sm text-slate-600 mb-2">Maximum hedging</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">FF: 25/15/10/5</Badge>
                <Badge variant="outline">Champ: 35/25/15/10/5</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
