"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  ArrowLeft, 
  Edit, 
  CheckCircle, 
  Clock, 
  Users,
  DollarSign,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getTeamName, getTeamInfo, getTeamLogo, REGIONS } from "@/lib/bracket-teams";

interface PickData {
  gameId: string;
  round: number;
  choices: string[];
}

interface Bracket {
  id: string;
  name: string;
  entryName: string;
  status: "DRAFT" | "SUBMITTED" | "PAID";
  totalScore: number;
  bonusScore: number;
  tiebreaker: number | null;
  paid: boolean;
  picksData: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  familyMember?: {
    id: string;
    name: string;
  } | null;
}

const ROUND_NAMES = ["First Round", "Second Round", "Sweet 16", "Elite 8", "Final Four", "Championship"];
const ROUND_POINTS = ["2 pts", "5 pts", "10/5 pts", "15/10/5 pts", "25/15/10/5 pts", "35/25/15/10/5 pts"];

export default function BracketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bracketId = params.id as string;
  
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/brackets/${bracketId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Bracket deleted successfully");
        router.push("/brackets");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete bracket");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchBracket = async () => {
      try {
        const response = await fetch(`/api/brackets/${bracketId}`);
        if (response.ok) {
          const data = await response.json();
          setBracket(data);
        } else if (response.status === 404) {
          router.push("/brackets");
        }
      } catch (error) {
        console.error("Failed to fetch bracket:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session && bracketId) {
      fetchBracket();
    }
  }, [session, bracketId, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !bracket) return null;

  // Parse picks data from JSON
  const parsedPicks: PickData[] = bracket.picksData 
    ? JSON.parse(bracket.picksData) 
    : [];

  const getStatusBadge = () => {
    switch (bracket.status) {
      case "PAID":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-blue-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Submitted
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Draft
          </Badge>
        );
    }
  };

  // Render team picks for a game
  const renderTeamPick = (teamId: string, rank: number) => {
    const name = getTeamName(teamId);
    const info = getTeamInfo(teamId);
    const logo = getTeamLogo(teamId);
    return (
      <div key={teamId} className="flex items-center gap-2 py-1">
        {rank > 0 && (
          <span className="text-xs text-slate-400 w-4 text-right shrink-0">{rank}.</span>
        )}
        {logo && (
          <Image
            src={logo}
            alt={name}
            width={20}
            height={20}
            className="w-5 h-5 object-contain shrink-0"
            unoptimized
          />
        )}
        <span className="text-sm font-medium">{name}</span>
        {info && (
          <span className="text-xs text-slate-400">({info.seed})</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/brackets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{bracket.name}</h1>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2 mt-1 text-slate-600">
              <span>Entry: {bracket.entryName}</span>
              {bracket.familyMember && (
                <Badge variant="outline" className="font-normal">
                  <Users className="mr-1 h-3 w-3" />
                  {bracket.familyMember.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {bracket.status === "DRAFT" && (
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href={`/brackets/${bracket.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Bracket
              </Link>
            </Button>
          )}
          {(bracket.status === "SUBMITTED" || bracket.status === "PAID") && !bracket.paid && (
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href="/payment">
                <DollarSign className="mr-2 h-4 w-4" />
                Pay Now
              </Link>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete Bracket
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>&quot;{bracket.name}&quot;</strong>?
                  This action cannot be undone. All picks and scores associated with this
                  bracket will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Bracket
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Score Card */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold text-primary">{bracket.totalScore}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bonus Points</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-slate-700">{bracket.bonusScore}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tiebreaker</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-slate-700">
              {bracket.tiebreaker ?? "—"}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payment Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className={`h-5 w-5 ${bracket.paid ? "text-green-500" : "text-slate-400"}`} />
              <span className={`text-lg font-semibold ${bracket.paid ? "text-green-600" : "text-slate-500"}`}>
                {bracket.paid ? "Paid" : "Unpaid"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bracket Picks - Full Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Your Bracket Picks
          </CardTitle>
          <CardDescription>
            {parsedPicks.length > 0 
              ? `${parsedPicks.length} games picked across all rounds`
              : "No picks recorded yet"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parsedPicks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No picks have been saved for this bracket yet.</p>
              {bracket.status === "DRAFT" && (
                <Button asChild className="mt-4 bg-primary hover:bg-primary/90">
                  <Link href={`/brackets/${bracket.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Start Filling Out Bracket
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((round) => {
                const roundPicks = parsedPicks.filter((p) => p.round === round);
                if (roundPicks.length === 0) return null;
                const isExpanded = expandedRounds.has(round);

                return (
                  <div key={round} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleRound(round)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">
                          Round {round}: {ROUND_NAMES[round - 1]}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ROUND_POINTS[round - 1]}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {roundPicks.length} {roundPicks.length === 1 ? "game" : "games"}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-3">
                        {round <= 4 ? (
                          // Region-based rounds
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {REGIONS.map((region) => {
                              const regionPicks = roundPicks.filter((p) =>
                                p.gameId.startsWith(region.toLowerCase())
                              );
                              if (regionPicks.length === 0) return null;
                              return (
                                <div key={region}>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                    {region}
                                  </p>
                                  <div className="space-y-2">
                                    {regionPicks.map((pick) => (
                                      <div
                                        key={pick.gameId}
                                        className="bg-slate-50 rounded-md p-2"
                                      >
                                        <p className="text-[10px] text-slate-400 mb-0.5">
                                          Game {pick.gameId.split("-g")[1]}
                                        </p>
                                        {pick.choices.map((teamId, i) =>
                                          renderTeamPick(teamId, pick.choices.length > 1 ? i + 1 : 0)
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Final Four & Championship
                          <div className="grid gap-4 md:grid-cols-2">
                            {roundPicks.map((pick) => {
                              const label =
                                round === 5
                                  ? pick.gameId.includes("g1")
                                    ? "East vs South"
                                    : "West vs Midwest"
                                  : "Championship Game";
                              return (
                                <div
                                  key={pick.gameId}
                                  className="bg-slate-50 rounded-md p-3"
                                >
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                    {label}
                                  </p>
                                  {pick.choices.map((teamId, i) =>
                                    renderTeamPick(teamId, i + 1)
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 text-sm text-slate-500">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {new Date(bracket.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{" "}
              {new Date(bracket.updatedAt).toLocaleString()}
            </div>
            {bracket.submittedAt && (
              <div>
                <span className="font-medium">Submitted:</span>{" "}
                {new Date(bracket.submittedAt).toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
