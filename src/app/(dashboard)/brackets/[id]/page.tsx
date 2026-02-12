"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

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

export default function BracketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bracketId = params.id as string;
  
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--team-primary)]" />
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
            <Button asChild className="bg-[var(--team-primary)] hover:bg-[var(--team-secondary)]">
              <Link href={`/brackets/${bracket.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Bracket
              </Link>
            </Button>
          )}
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
              <Trophy className="h-5 w-5 text-[var(--team-primary)]" />
              <span className="text-3xl font-bold text-[var(--team-primary)]">{bracket.totalScore}</span>
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

      {/* Bracket Picks Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Bracket Picks</CardTitle>
          <CardDescription>
            {parsedPicks.length > 0 
              ? `${parsedPicks.length} picks made`
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
                <Button asChild className="mt-4 bg-[var(--team-primary)] hover:bg-[var(--team-secondary)]">
                  <Link href={`/brackets/${bracket.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Start Filling Out Bracket
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-600 mb-4">
                Your picks have been saved. {parsedPicks.length} games selected.
              </p>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((round) => {
                  const roundPicks = parsedPicks.filter((p: PickData) => p.round === round);
                  const roundNames = ["First Round", "Second Round", "Sweet 16", "Elite 8", "Final Four", "Championship"];
                  return (
                    <div key={round} className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-sm text-slate-700">
                        Round {round}: {roundNames[round - 1]}
                      </p>
                      <p className="text-2xl font-bold text-[var(--team-primary)]">
                        {roundPicks.length} picks
                      </p>
                    </div>
                  );
                })}
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
