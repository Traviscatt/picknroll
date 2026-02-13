"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  brackets: {
    id: string;
    name: string;
    status: string;
  }[];
}

export default function FamilyMembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const response = await fetch("/api/family-members");
        if (response.ok) {
          const data = await response.json();
          setFamilyMembers(data);
        }
      } catch (error) {
        console.error("Failed to fetch family members:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchFamilyMembers();
    }
  }, [session]);

  const handleAddMember = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add family member");
      }

      const member = await response.json();
      setFamilyMembers([...familyMembers, member]);
      setNewName("");
      setNewEmail("");
      setIsAddDialogOpen(false);
      toast.success(`${member.name} added to your family`);
    } catch (error) {
      toast.error("Failed to add family member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMember = async () => {
    if (!editingMember || !newName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/family-members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update family member");
      }

      const updated = await response.json();
      setFamilyMembers(
        familyMembers.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
      );
      setIsEditDialogOpen(false);
      setEditingMember(null);
      toast.success("Family member updated");
    } catch (error) {
      toast.error("Failed to update family member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (member: FamilyMember) => {
    try {
      const response = await fetch(`/api/family-members/${member.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete family member");
      }

      setFamilyMembers(familyMembers.filter((m) => m.id !== member.id));
      toast.success(`${member.name} removed from your family`);
    } catch (error) {
      toast.error("Failed to delete family member");
    }
  };

  const openEditDialog = (member: FamilyMember) => {
    setEditingMember(member);
    setNewName(member.name);
    setNewEmail(member.email || "");
    setIsEditDialogOpen(true);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Family Members</h1>
          <p className="text-slate-600 mt-1">
            Manage brackets for your family members
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
              <DialogDescription>
                Add a family member so you can create and manage brackets for them.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter their name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="For future login access"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  If provided, they can create their own account later to manage their bracket.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleAddMember}
                disabled={isSaving}
              >
                {isSaving ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong> Add family members here, then when creating
                a bracket, you can choose to create it for yourself or any family member.
                Each person can only have one bracket entry.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Members List */}
      {familyMembers.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold mb-2">No family members yet</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Add family members to create and manage brackets on their behalf.
              </p>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Family Member
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {familyMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    {member.email && (
                      <CardDescription>{member.email}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(member)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {member.brackets.length > 0
                              ? `This will remove ${member.name} from your family. Their ${member.brackets.length} bracket(s) will still exist but won't be linked to them.`
                              : `This will remove ${member.name} from your family.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600"
                            onClick={() => handleDeleteMember(member)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {member.brackets.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 mb-2">Brackets:</p>
                    {member.brackets.map((bracket) => (
                      <div
                        key={bracket.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          {bracket.name}
                        </span>
                        <Badge
                          variant={
                            bracket.status === "SUBMITTED"
                              ? "default"
                              : "outline"
                          }
                          className={
                            bracket.status === "SUBMITTED"
                              ? "bg-green-500"
                              : ""
                          }
                        >
                          {bracket.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No brackets yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Family Member</DialogTitle>
            <DialogDescription>
              Update the details for this family member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter their name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email (optional)</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="For future login access"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleEditMember}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
