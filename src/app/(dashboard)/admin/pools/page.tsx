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
  Share2,
  Link as LinkIcon,
  Trash2,
  Pencil,
  Save,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Crown,
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
  venmoHandle?: string | null;
  paypalLink?: string | null;
  createdAt: string;
  members: { userId: string; role: string; user: { name: string; email?: string } }[];
  _count: { brackets: number };
}

interface EditForm {
  name: string;
  description: string;
  entryFee: string;
  deadline: string;
  venmoHandle: string;
  paypalLink: string;
}

export default function AdminPoolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingPoolId, setDeletingPoolId] = useState<string | null>(null);

  // Edit dialog state
  const [editingPool, setEditingPool] = useState<Pool | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    description: "",
    entryFee: "5",
    deadline: "",
    venmoHandle: "",
    paypalLink: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);

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

  const openEditDialog = (pool: Pool) => {
    setEditingPool(pool);
    const deadlineDate = new Date(pool.deadline);
    const localDeadline = deadlineDate.getFullYear() + "-" +
      String(deadlineDate.getMonth() + 1).padStart(2, "0") + "-" +
      String(deadlineDate.getDate()).padStart(2, "0") + "T" +
      String(deadlineDate.getHours()).padStart(2, "0") + ":" +
      String(deadlineDate.getMinutes()).padStart(2, "0");
    setEditForm({
      name: pool.name,
      description: pool.description || "",
      entryFee: parseFloat(pool.entryFee).toString(),
      deadline: localDeadline,
      venmoHandle: pool.venmoHandle || "",
      paypalLink: pool.paypalLink || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPool) return;
    if (!editForm.name.trim()) {
      toast.error("Pool name is required");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/pools/${editingPool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || undefined,
          entryFee: parseFloat(editForm.entryFee) || 5,
          deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : undefined,
          venmoHandle: editForm.venmoHandle || undefined,
          paypalLink: editForm.paypalLink || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update pool");
      }

      const updatedPool = await response.json();
      setPools(pools.map((p) => (p.id === updatedPool.id ? updatedPool : p)));
      setEditingPool(null);
      toast.success("Pool settings saved!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update pool";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  const handleCopyInviteLink = (code: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://picknroll.net";
    const link = `${baseUrl}/join?code=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied! Share it with your pool members.");
  };

  const handleDeletePool = async (poolId: string, poolName: string) => {
    if (!confirm(`Are you sure you want to delete "${poolName}"? This will also delete all brackets and picks in this pool. This action cannot be undone.`)) {
      return;
    }

    setDeletingPoolId(poolId);
    try {
      const response = await fetch(`/api/pools/${poolId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete pool");
      }

      setPools(pools.filter((p) => p.id !== poolId));
      toast.success(`Pool "${poolName}" deleted successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete pool";
      toast.error(message);
    } finally {
      setDeletingPoolId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
              Create, edit, and manage bracket pools
            </p>
          </div>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
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
                className="bg-primary hover:bg-primary/90"
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
                  <div className="flex items-center gap-2">
                    <Badge
                      className={pool.status === "OPEN" ? "bg-green-500" : "bg-slate-500"}
                    >
                      {pool.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(pool)}
                      title="Edit pool settings"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeletePool(pool.id, pool.name)}
                      disabled={deletingPoolId === pool.id}
                    >
                      {deletingPoolId === pool.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  Deadline: {new Date(pool.deadline).toLocaleString()}
                </div>
                {(pool.venmoHandle || pool.paypalLink) && (
                  <div className="mt-2 text-sm text-slate-500">
                    <DollarSign className="h-3.5 w-3.5 inline mr-1" />
                    Payment:{" "}
                    {pool.venmoHandle && <span>Venmo {pool.venmoHandle}</span>}
                    {pool.venmoHandle && pool.paypalLink && <span> · </span>}
                    {pool.paypalLink && <span>PayPal</span>}
                  </div>
                )}

                {/* Expandable Members List */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setExpandedPoolId(expandedPoolId === pool.id ? null : pool.id)}
                    className="flex items-center justify-between w-full text-sm font-medium text-slate-700 hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      Pool Members ({pool.members?.length ?? 0})
                    </span>
                    {expandedPoolId === pool.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {expandedPoolId === pool.id && pool.members && (
                    <div className="mt-2 space-y-1">
                      {pool.members.map((member, idx) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between py-1.5 px-2 rounded text-sm bg-slate-50"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                            <span>
                              <span className="font-medium">{member.user.name || "Unknown"}</span>
                              {member.user.email && (
                                <span className="text-xs text-slate-400 ml-2">{member.user.email}</span>
                              )}
                            </span>
                          </span>
                          {member.role === "ADMIN" && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      ))}
                      {pool.members.length === 0 && (
                        <p className="text-xs text-slate-400 py-2">No members yet</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    Shareable Invite Link
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-100 rounded px-3 py-2 font-mono truncate">
                      {typeof window !== "undefined" ? window.location.origin : "https://picknroll.net"}/join?code={pool.inviteCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInviteLink(pool.inviteCode)}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Prize Distribution */}
      {pools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Prize Distribution
            </CardTitle>
            <CardDescription>How the prize pool will be split</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="font-medium">1st Place</span>
                <span className="text-lg font-bold">65%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                <span className="font-medium">2nd Place</span>
                <span className="text-lg font-bold">25%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <span className="font-medium">3rd Place</span>
                <span className="text-lg font-bold">10%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Prize distribution is fixed. Contact support to customize.
            </p>
          </CardContent>
        </Card>
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
              className="bg-primary hover:bg-primary/90"
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

      {/* Edit Pool Dialog */}
      <Dialog open={!!editingPool} onOpenChange={(open) => !open && setEditingPool(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Pool Settings</DialogTitle>
            <DialogDescription>
              Update pool details, deadline, and payment methods.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Pool Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fee">Entry Fee ($)</Label>
                <Input
                  id="edit-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.entryFee}
                  onChange={(e) => setEditForm({ ...editForm, entryFee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Deadline</Label>
                <Input
                  id="edit-deadline"
                  type="datetime-local"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-venmo">Venmo Handle</Label>
                <Input
                  id="edit-venmo"
                  value={editForm.venmoHandle}
                  onChange={(e) => setEditForm({ ...editForm, venmoHandle: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-paypal">PayPal Link</Label>
                <Input
                  id="edit-paypal"
                  value={editForm.paypalLink}
                  onChange={(e) => setEditForm({ ...editForm, paypalLink: e.target.value })}
                  placeholder="https://paypal.me/..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPool(null)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
