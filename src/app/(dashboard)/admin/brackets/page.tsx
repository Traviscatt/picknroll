"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  Clock,
  MoreHorizontal,
  Search,
  DollarSign,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Bracket {
  id: string;
  name: string;
  entryName: string;
  status: string;
  totalScore: number;
  bonusScore: number;
  tiebreaker: number | null;
  paid: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  familyMember?: {
    id: string;
    name: string;
  } | null;
}

export default function AdminBracketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [filteredBrackets, setFilteredBrackets] = useState<Bracket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPaid, setFilterPaid] = useState<"all" | "paid" | "unpaid">("all");
  const [editingBracket, setEditingBracket] = useState<Bracket | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editBonus, setEditBonus] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchBrackets = async () => {
      try {
        const response = await fetch("/api/admin/brackets");
        if (response.ok) {
          const data = await response.json();
          setBrackets(data);
          setFilteredBrackets(data);
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

  useEffect(() => {
    let filtered = brackets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.entryName.toLowerCase().includes(query) ||
          b.name.toLowerCase().includes(query) ||
          b.user.name.toLowerCase().includes(query) ||
          b.user.email.toLowerCase().includes(query)
      );
    }

    if (filterPaid !== "all") {
      filtered = filtered.filter((b) =>
        filterPaid === "paid" ? b.paid : !b.paid
      );
    }

    setFilteredBrackets(filtered);
  }, [searchQuery, filterPaid, brackets]);

  const handleTogglePaid = async (bracket: Bracket) => {
    try {
      const response = await fetch(`/api/admin/brackets/${bracket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: !bracket.paid }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setBrackets(
        brackets.map((b) =>
          b.id === bracket.id ? { ...b, paid: !b.paid } : b
        )
      );
      toast.success(`Marked as ${!bracket.paid ? "paid" : "unpaid"}`);
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  const handleUpdateScore = async () => {
    if (!editingBracket) return;

    try {
      const response = await fetch(`/api/admin/brackets/${editingBracket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalScore: parseInt(editScore) || 0,
          bonusScore: parseInt(editBonus) || 0,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setBrackets(
        brackets.map((b) =>
          b.id === editingBracket.id
            ? {
                ...b,
                totalScore: parseInt(editScore) || 0,
                bonusScore: parseInt(editBonus) || 0,
              }
            : b
        )
      );
      setEditingBracket(null);
      toast.success("Score updated");
    } catch {
      toast.error("Failed to update score");
    }
  };

  const handleDelete = async (bracket: Bracket) => {
    if (!confirm(`Delete bracket "${bracket.name}" by ${bracket.entryName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/brackets/${bracket.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setBrackets(brackets.filter((b) => b.id !== bracket.id));
      toast.success("Bracket deleted");
    } catch {
      toast.error("Failed to delete bracket");
    }
  };

  const openEditDialog = (bracket: Bracket) => {
    setEditingBracket(bracket);
    setEditScore(bracket.totalScore.toString());
    setEditBonus(bracket.bonusScore.toString());
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!session) return null;

  const paidCount = brackets.filter((b) => b.paid).length;
  const unpaidCount = brackets.filter((b) => !b.paid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manage Brackets</h1>
          <p className="text-slate-600">
            {brackets.length} total • {paidCount} paid • {unpaidCount} unpaid
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterPaid === "all" ? "default" : "outline"}
                onClick={() => setFilterPaid("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterPaid === "paid" ? "default" : "outline"}
                onClick={() => setFilterPaid("paid")}
                size="sm"
                className={filterPaid === "paid" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Paid ({paidCount})
              </Button>
              <Button
                variant={filterPaid === "unpaid" ? "default" : "outline"}
                onClick={() => setFilterPaid("unpaid")}
                size="sm"
                className={filterPaid === "unpaid" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
              >
                <Clock className="h-4 w-4 mr-1" />
                Unpaid ({unpaidCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brackets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Brackets</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBrackets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No brackets found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry Name</TableHead>
                  <TableHead>Bracket Name</TableHead>
                  <TableHead>Managed By</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Payment</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Tiebreaker</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrackets.map((bracket) => (
                  <TableRow key={bracket.id}>
                    <TableCell className="font-medium">
                      {bracket.entryName}
                      {bracket.familyMember && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Family
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{bracket.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{bracket.user.name}</p>
                        <p className="text-xs text-slate-500">{bracket.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={bracket.status === "SUBMITTED" ? "default" : "outline"}
                        className={bracket.status === "SUBMITTED" ? "bg-blue-500" : ""}
                      >
                        {bracket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePaid(bracket)}
                        className={bracket.paid ? "text-green-600" : "text-yellow-600"}
                      >
                        {bracket.paid ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Paid
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 mr-1" />
                            Unpaid
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-[var(--team-primary)]">
                        {bracket.totalScore + bracket.bonusScore}
                      </span>
                      {bracket.bonusScore > 0 && (
                        <span className="text-xs text-green-600 ml-1">
                          (+{bracket.bonusScore})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      {bracket.tiebreaker ?? "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTogglePaid(bracket)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            {bracket.paid ? "Mark Unpaid" : "Mark Paid"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(bracket)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Score
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(bracket)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Score Dialog */}
      <Dialog open={!!editingBracket} onOpenChange={() => setEditingBracket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Score</DialogTitle>
            <DialogDescription>
              Adjust the score for {editingBracket?.entryName}&apos;s bracket
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Score</label>
              <Input
                type="number"
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                placeholder="Enter total score"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bonus Score</label>
              <Input
                type="number"
                value={editBonus}
                onChange={(e) => setEditBonus(e.target.value)}
                placeholder="Enter bonus points"
              />
              <p className="text-xs text-slate-500">
                Bonus points for Final Four perfect picks (+10)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBracket(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--team-primary)] hover:bg-[var(--team-secondary)]"
              onClick={handleUpdateScore}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
