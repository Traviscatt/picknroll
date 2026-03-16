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
import { Switch } from "@/components/ui/switch";
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
  Loader2,
  CheckCircle,
  Trash2,
  Pin,
  Megaphone,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  message: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
  };
}

export default function AdminAnnouncementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New announcement form state
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPinned, setNewPinned] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch("/api/announcements");
        if (response.ok) {
          setAnnouncements(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchAnnouncements();
  }, [session]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!newMessage.trim()) {
      toast.error("Message is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          message: newMessage,
          pinned: newPinned,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create announcement");
      }

      const announcement = await response.json();
      setAnnouncements([announcement, ...announcements]);
      setShowCreateDialog(false);
      resetForm();
      toast.success("Announcement posted!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create announcement";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete announcement");
      }

      setAnnouncements(announcements.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete announcement";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !announcement.pinned }),
      });

      if (!response.ok) {
        throw new Error("Failed to update announcement");
      }

      const updated = await response.json();
      setAnnouncements(
        announcements
          .map((a) => (a.id === updated.id ? updated : a))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
      );
      toast.success(updated.pinned ? "Announcement pinned" : "Announcement unpinned");
    } catch (error) {
      toast.error("Failed to update announcement");
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewMessage("");
    setNewPinned(false);
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
            <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
            <p className="text-slate-600">
              Post messages to all bracket participants
            </p>
          </div>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Megaphone className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold mb-2">No announcements yet</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Post your first announcement to communicate with all bracket participants.
              </p>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Post First Announcement
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className={announcement.pinned ? "border-primary border-2" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      {announcement.pinned && (
                        <Badge className="bg-primary">
                          <Pin className="h-3 w-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      Posted by {announcement.author.name} on{" "}
                      {new Date(announcement.createdAt).toLocaleDateString()} at{" "}
                      {new Date(announcement.createdAt).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleTogglePin(announcement)}
                      title={announcement.pinned ? "Unpin" : "Pin to top"}
                    >
                      <Pin className={`h-4 w-4 ${announcement.pinned ? "text-primary" : "text-slate-400"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(announcement.id)}
                      disabled={deletingId === announcement.id}
                    >
                      {deletingId === announcement.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{announcement.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Announcement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              New Announcement
            </DialogTitle>
            <DialogDescription>
              This message will be visible to all bracket participants on their dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Important Update"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write your announcement here..."
                rows={5}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pinned">Pin to top</Label>
                <p className="text-xs text-slate-500">Pinned announcements appear first</p>
              </div>
              <Switch
                id="pinned"
                checked={newPinned}
                onCheckedChange={setNewPinned}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Post Announcement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
