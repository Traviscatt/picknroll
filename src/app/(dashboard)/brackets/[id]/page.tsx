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
  Crown,
  Download,
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
  pool?: {
    id: string;
    deadline: string;
  } | null;
}

const ROUND_LABELS: Record<number, string> = { 1: "R1", 2: "R2", 3: "S16", 4: "E8" };

export default function BracketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bracketId = params.id as string;
  
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("East");
  const [isDownloading, setIsDownloading] = useState(false);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/brackets/${bracketId}/pdf`);
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to generate PDF");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bracket?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "bracket"}_picks.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Something went wrong generating the PDF");
    } finally {
      setIsDownloading(false);
    }
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
        const [bracketRes, eliminatedRes] = await Promise.all([
          fetch(`/api/brackets/${bracketId}`),
          fetch("/api/eliminated-teams"),
        ]);
        
        if (bracketRes.ok) {
          const data = await bracketRes.json();
          setBracket(data);
        } else if (bracketRes.status === 404) {
          router.push("/brackets");
        }
        
        if (eliminatedRes.ok) {
          const elimData = await eliminatedRes.json();
          setEliminatedTeams(new Set(elimData.eliminated || []));
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

  // Game IDs: "East-r1-g1", "South-r2-g3", "final-four-r5-g1", "championship-r6-g1"
  const getRegionPicks = (region: string) => {
    return parsedPicks.filter((p) => p.gameId.startsWith(`${region}-r`));
  };

  const getFinalFourPicks = () => {
    return parsedPicks.filter((p) => p.gameId.startsWith("final-four-"));
  };

  const getChampionshipPick = () => {
    return parsedPicks.find((p) => p.gameId.startsWith("championship-"));
  };

  const renderTeam = (teamId: string, rank: number, size: "sm" | "md" = "sm") => {
    const name = getTeamName(teamId);
    const info = getTeamInfo(teamId);
    const logo = getTeamLogo(teamId);
    const imgSize = size === "md" ? 24 : 18;
    const isEliminated = eliminatedTeams.has(teamId);
    return (
      <div key={`${teamId}-${rank}`} className={`flex items-center gap-1.5 ${isEliminated ? "opacity-50" : ""}`}>
        {rank > 0 && (
          <span className={`font-bold shrink-0 w-4 text-right ${rank === 1 ? "text-primary" : "text-slate-400"} ${size === "md" ? "text-sm" : "text-[11px]"}`}>
            {rank}.
          </span>
        )}
        {logo && (
          <Image
            src={logo}
            alt={name}
            width={imgSize}
            height={imgSize}
            className={`${size === "md" ? "w-6 h-6" : "w-[18px] h-[18px]"} object-contain shrink-0`}
            unoptimized
          />
        )}
        <span className={`font-medium truncate ${size === "md" ? "text-sm" : "text-xs"}`}>{name}</span>
        {info && (
          <span className={`text-slate-400 shrink-0 ${size === "md" ? "text-xs" : "text-[10px]"}`}>({info.seed})</span>
        )}
      </div>
    );
  };

  const renderGameCard = (pick: PickData, roundNum: number) => {
    const gameNum = pick.gameId.split("-g")[1];
    return (
      <div key={pick.gameId} className="bg-white border rounded-md p-2 space-y-0.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-400 font-medium">Game {gameNum}</span>
          <span className="text-[10px] text-slate-400">{ROUND_LABELS[roundNum]}</span>
        </div>
        {pick.choices.map((teamId, i) =>
          renderTeam(teamId, pick.choices.length > 1 ? i + 1 : 0)
        )}
      </div>
    );
  };

  const renderRegionContent = (region: string) => {
    const regionPicks = getRegionPicks(region);
    if (regionPicks.length === 0) {
      return (
        <p className="text-sm text-slate-400 text-center py-6">No picks for this region yet.</p>
      );
    }

    const roundNames = ["First Round", "Second Round", "Sweet 16", "Elite 8"];
    const roundPoints = ["2 pts", "5 pts", "10/5 pts", "15/10/5 pts"];

    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((round) => {
          const roundPicks = regionPicks
            .filter((p) => {
              const match = p.gameId.match(/-r(\d+)-/);
              return match ? parseInt(match[1]) === round : false;
            })
            .sort((a, b) => {
              const aNum = parseInt(a.gameId.split("-g")[1] || "0");
              const bNum = parseInt(b.gameId.split("-g")[1] || "0");
              return aNum - bNum;
            });
          if (roundPicks.length === 0) return null;

          return (
            <div key={round}>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {roundNames[round - 1]}
                </h4>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {roundPoints[round - 1]}
                </Badge>
              </div>
              <div className={`grid gap-2 ${round <= 2 ? "grid-cols-2 sm:grid-cols-4" : round === 3 ? "grid-cols-2" : "grid-cols-1 max-w-xs"}`}>
                {roundPicks.map((pick) => renderGameCard(pick, round))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFinalContent = () => {
    const ff = getFinalFourPicks();
    const champ = getChampionshipPick();

    if (ff.length === 0 && !champ) {
      return (
        <p className="text-sm text-slate-400 text-center py-6">No Final Four picks yet.</p>
      );
    }

    return (
      <div className="space-y-6">
        {ff.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Final Four</h4>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">25/15/10/5 pts</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ff.map((pick) => {
                const label = pick.gameId.includes("g1") ? "East vs South" : "West vs Midwest";
                return (
                  <div key={pick.gameId} className="bg-white border rounded-lg p-3">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
                    <div className="space-y-1">
                      {pick.choices.map((teamId, i) => renderTeam(teamId, i + 1, "md"))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {champ && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-yellow-500" />
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Championship</h4>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">35/25/15/10/5 pts</Badge>
            </div>
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-4 max-w-md">
              <div className="space-y-1.5">
                {champ.choices.map((teamId, i) => renderTeam(teamId, i + 1, "md"))}
              </div>
              {bracket.tiebreaker !== null && (
                <div className="mt-3 pt-3 border-t border-primary/10">
                  <span className="text-xs text-slate-500">Tiebreaker (total score): </span>
                  <span className="text-sm font-bold text-primary">{bracket.tiebreaker}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs = [...REGIONS, "Final Four"];

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
          {(() => {
            const deadlinePassed = bracket.pool?.deadline
              ? new Date() > new Date(bracket.pool.deadline)
              : false;
            const canEdit =
              bracket.status === "DRAFT" ||
              ((bracket.status === "SUBMITTED" || bracket.status === "PAID") && !deadlinePassed);

            if (canEdit) {
              return (
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link href={`/brackets/${bracket.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Bracket
                  </Link>
                </Button>
              );
            }
            if (deadlinePassed && (bracket.status === "SUBMITTED" || bracket.status === "PAID")) {
              return (
                <Button variant="outline" disabled>
                  <Clock className="mr-2 h-4 w-4" />
                  Locked (Deadline Passed)
                </Button>
              );
            }
            return null;
          })()}
          {(bracket.status === "SUBMITTED" || bracket.status === "PAID") && !bracket.paid && (
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href="/payment">
                <DollarSign className="mr-2 h-4 w-4" />
                Pay Now
              </Link>
            </Button>
          )}
          {parsedPicks.length > 0 && (
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
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

      {/* Score Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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
            <CardDescription>Payment</CardDescription>
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

      {/* Bracket Picks - Region Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Your Bracket Picks
          </CardTitle>
          <CardDescription>
            {parsedPicks.length > 0 
              ? `${parsedPicks.length} games picked`
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
            <div>
              {/* Tab navigation */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1 border-b">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab;
                  const isFinal = tab === "Final Four";
                  const pickCount = isFinal
                    ? getFinalFourPicks().length + (getChampionshipPick() ? 1 : 0)
                    : getRegionPicks(tab).length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap
                        ${isActive
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        }
                        ${isFinal ? "flex items-center gap-1.5" : ""}
                      `}
                    >
                      {isFinal && <Crown className="h-3.5 w-3.5" />}
                      {tab}
                      {pickCount > 0 && (
                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                          {pickCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="bg-slate-50 rounded-lg p-4">
                {activeTab === "Final Four"
                  ? renderFinalContent()
                  : renderRegionContent(activeTab)
                }
              </div>
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
