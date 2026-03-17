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
import { ArrowLeft, Save, DollarSign, Calendar, Link as LinkIcon, Share2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PoolSettings {
  name: string;
  description: string;
  entryFee: number;
  deadline: string;
  venmoHandle: string;
  paypalEmail: string;
  viewCode: string | null;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<PoolSettings>({
    name: "",
    description: "",
    entryFee: 5,
    deadline: "",
    venmoHandle: "",
    paypalEmail: "",
    viewCode: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings({
            name: data.name || "",
            description: data.description || "",
            entryFee: data.entryFee ?? 5,
            deadline: data.deadline || "",
            venmoHandle: data.venmoHandle || "",
            paypalEmail: data.paypalLink || "",
            viewCode: data.viewCode || null,
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchSettings();
  }, [session]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          entryFee: settings.entryFee,
          deadline: settings.deadline,
          venmoHandle: settings.venmoHandle,
          paypalLink: settings.paypalEmail,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
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
            <h1 className="text-3xl font-bold text-slate-900">Pool Settings</h1>
            <p className="text-slate-600">
              Configure your bracket pool
            </p>
          </div>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>Basic pool details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Pool Name</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              placeholder="Enter pool name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              placeholder="Describe your pool"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Entry Fee & Deadline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Entry Fee & Deadline
          </CardTitle>
          <CardDescription>Payment and submission requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee ($)</Label>
              <Input
                id="entryFee"
                type="number"
                min="0"
                step="0.01"
                value={settings.entryFee}
                onChange={(e) => setSettings({ ...settings, entryFee: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Submission Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={settings.deadline}
                onChange={(e) => setSettings({ ...settings, deadline: e.target.value })}
              />
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <Calendar className="h-4 w-4 inline mr-1" />
              Brackets must be submitted before this deadline to be eligible.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-blue-500" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Configure payment options shown to users after submission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venmo">Venmo Handle</Label>
              <Input
                id="venmo"
                value={settings.venmoHandle}
                onChange={(e) => setSettings({ ...settings, venmoHandle: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal">PayPal Email</Label>
              <Input
                id="paypal"
                type="email"
                value={settings.paypalEmail}
                onChange={(e) => setSettings({ ...settings, paypalEmail: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Leave blank to hide that payment option from users.
          </p>
        </CardContent>
      </Card>

      {/* Share Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-500" />
            Share Leaderboard
          </CardTitle>
          <CardDescription>
            Generate a view code so anyone can see the leaderboard without an account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.viewCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 border rounded-lg px-4 py-2.5 font-mono text-sm">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/share/leaderboard/${settings.viewCode}`}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/share/leaderboard/${settings.viewCode}`
                    );
                    toast.success("Link copied!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-500">
                  View code: <span className="font-mono font-medium">{settings.viewCode}</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      const res = await fetch("/api/admin/settings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ generateViewCode: true }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setSettings((s) => ({ ...s, viewCode: data.viewCode }));
                        toast.success("New view code generated!");
                      }
                    } catch {
                      toast.error("Failed to regenerate code");
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="bg-purple-500 hover:bg-purple-600"
              disabled={isGenerating}
              onClick={async () => {
                setIsGenerating(true);
                try {
                  const res = await fetch("/api/admin/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ generateViewCode: true }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setSettings((s) => ({ ...s, viewCode: data.viewCode }));
                    toast.success("Share link generated!");
                  }
                } catch {
                  toast.error("Failed to generate code");
                } finally {
                  setIsGenerating(false);
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Share Link"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Prize Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Prize Distribution</CardTitle>
          <CardDescription>How the prize pool will be split</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="font-medium">🥇 1st Place</span>
              <span className="text-lg font-bold">65%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
              <span className="font-medium">🥈 2nd Place</span>
              <span className="text-lg font-bold">25%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <span className="font-medium">🥉 3rd Place</span>
              <span className="text-lg font-bold">10%</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Prize distribution is fixed. Contact support to customize.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
