"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Upload, Clock, CheckCircle, Edit, Users } from "lucide-react";

interface Bracket {
  id: string;
  name: string;
  entryName: string;
  status: "DRAFT" | "SUBMITTED" | "PAID";
  totalScore: number;
  paid: boolean;
  updatedAt: string;
  pool?: {
    name: string;
  };
  familyMember?: {
    id: string;
    name: string;
  } | null;
}

export default function BracketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchBrackets = async () => {
      try {
        const response = await fetch("/api/brackets");
        if (response.ok) {
          const data = await response.json();
          setBrackets(data);
        }
      } catch (error) {
        console.error("Failed to fetch brackets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchBrackets();
    }
  }, [session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-9 w-full mt-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Brackets</h1>
          <p className="text-slate-600 mt-1">
            Create, manage, and track your tournament brackets
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/brackets/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Bracket
            </Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/brackets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Bracket
            </Link>
          </Button>
        </div>
      </div>

      {/* Brackets List */}
      {brackets.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold mb-2">No brackets yet</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Create your first bracket to start competing in the pool. You can
                fill it out online or upload an image of your completed bracket.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link href="/brackets/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Bracket Online
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/brackets/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Bracket Image
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {brackets.map((bracket) => (
            <Card key={bracket.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {bracket.name}
                      {bracket.familyMember && (
                        <Badge variant="outline" className="font-normal">
                          <Users className="mr-1 h-3 w-3" />
                          {bracket.familyMember.name}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Entry: <span className="font-medium">{bracket.entryName}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        bracket.status === "PAID"
                          ? "default"
                          : bracket.status === "SUBMITTED"
                          ? "secondary"
                          : "outline"
                      }
                      className={
                        bracket.status === "PAID"
                          ? "bg-green-500"
                          : bracket.status === "SUBMITTED"
                          ? "bg-blue-500"
                          : ""
                      }
                    >
                      {bracket.status === "PAID" && (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      )}
                      {bracket.status === "DRAFT" && (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {bracket.status}
                    </Badge>
                    {bracket.paid && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Paid
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Last updated: {new Date(bracket.updatedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Score</p>
                      <p className="text-2xl font-bold text-primary">
                        {bracket.totalScore}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/brackets/${bracket.id}`}>View</Link>
                    </Button>
                    {bracket.status === "DRAFT" && (
                      <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                        <Link href={`/brackets/${bracket.id}/edit`}>
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
