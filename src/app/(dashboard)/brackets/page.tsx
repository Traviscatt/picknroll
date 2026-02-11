"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Upload, Clock, CheckCircle, Edit, Users, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!session) return null;

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/brackets/${deletingId}`, { method: "DELETE" });
      if (response.ok) {
        setBrackets(brackets.filter((b) => b.id !== deletingId));
        toast.success("Bracket deleted");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete bracket");
      }
    } catch {
      toast.error("Failed to delete bracket");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeletingId(null);
    }
  };

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
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
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
                <Button asChild className="bg-orange-500 hover:bg-orange-600">
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
                      <p className="text-2xl font-bold text-orange-500">
                        {bracket.totalScore}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/brackets/${bracket.id}`}>View</Link>
                    </Button>
                    {bracket.status === "DRAFT" && (
                      <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600">
                        <Link href={`/brackets/${bracket.id}/edit`}>
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setDeletingId(bracket.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bracket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bracket? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
