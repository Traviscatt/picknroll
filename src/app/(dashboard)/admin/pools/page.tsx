"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Copy,
  Users,
  Trophy,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Pool {
  id: string;
  name: string;
  description: string | null;
  entryFee: string;
  inviteCode: string;
  deadline: string;
  status: string;
  createdAt: string;
  members: { userId: string; role: string; user: { name: string } }[];
  _count: { brackets: number };
}

export default function AdminPoolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New pool form state
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolDescription, setNewPoolDescription] = useState("");
  const [newPoolFee, setNewPoolFee] = useState("5");
  const [newPoolDeadline, setNewPoolDeadline] = useState("");
  const [newPoolVenmo, setNewPoolVenmo] = useState("");
  const [newPoolPaypal, setNewPoolPaypal] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await fetch("/api/pools");
        if (response.ok) {
          setPools(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch pools:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchPools();
  }, [session]);

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) {
      toast.error("Pool name is required");
      return;
    }
    if (!newPoolDeadline) {
      toast.error("Deadline is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPoolName,
          description: newPoolDescription || undefined,
          entryFee: parseFloat(newPoolFee) || 5,
          deadline: new Date(newPoolDeadline).toISOString(),
          venmoHandle: newPoolVenmo || undefined,
          paypalLink: newPoolPaypal || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create pool");
      }

      const pool = await response.json();
      setPools([pool, ...pools]);
      setShowCreateDialog(false);
      resetForm();
      toast.success(`Pool "${pool.name}" created! Invite code: ${pool.inviteCode}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create pool";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewPoolName("");
    setNewPoolDescription("");
    setNewPoolFee("5");
    setNewPoolDeadline("");
    setNewPoolVenmo("");
    setNewPoolPaypal("");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!session) return null;

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
            <h1 className="text-3xl font-bold text-slate-900">Manage Pools</h1>
            <p className="text-slate-600">
              Create and manage bracket pools
            </p>
          </div>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Pool
        </Button>
      </div>

      {/* Pools List */}
      {pools.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold mb-2">No pools yet</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Create your first pool to start accepting bracket entries.
              </p>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Pool
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pools.map((pool) => (
            <Card key={pool.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{pool.name}</CardTitle>
                    {pool.description && (
                      <CardDescription className="mt-1">{pool.description}</CardDescription>
                    )}
                  </div>
                  <Badge
                    className={pool.status === "OPEN" ? "bg-green-500" : "bg-slate-500"}
                  >
                    {pool.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Invite Code</p>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-semibold">{pool.inviteCode}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyCode(pool.inviteCode)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Entry Fee</p>
                    <p className="font-semibold">${parseFloat(pool.entryFee).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Members</p>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold">{pool.members?.length ?? 0}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Brackets</p>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold">{pool._count?.brackets ?? 0}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  Deadline: {new Date(pool.deadline).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pool Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Pool</DialogTitle>
            <DialogDescription>
              Set up a new bracket pool. An invite code will be automatically generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pool-name">Pool Name *</Label>
              <Input
                id="pool-name"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                placeholder="March Madness 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pool-desc">Description</Label>
              <Textarea
                id="pool-desc"
                value={newPoolDescription}
                onChange={(e) => setNewPoolDescription(e.target.value)}
                placeholder="Annual bracket pool for friends and family"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pool-fee">Entry Fee ($)</Label>
                <Input
                  id="pool-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPoolFee}
                  onChange={(e) => setNewPoolFee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pool-deadline">Deadline *</Label>
                <Input
                  id="pool-deadline"
                  type="datetime-local"
                  value={newPoolDeadline}
                  onChange={(e) => setNewPoolDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pool-venmo">Venmo Handle</Label>
                <Input
                  id="pool-venmo"
                  value={newPoolVenmo}
                  onChange={(e) => setNewPoolVenmo(e.target.value)}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pool-paypal">PayPal Link</Label>
                <Input
                  id="pool-paypal"
                  value={newPoolPaypal}
                  onChange={(e) => setNewPoolPaypal(e.target.value)}
                  placeholder="https://paypal.me/..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleCreatePool}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Pool
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
