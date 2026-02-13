"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Save, Users, Bell, Shield, Search, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { TEAMS, getTeamBySlug, generatePalette } from "@/lib/team-colors";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setFavoriteTeam(session.user.favoriteTeam || null);
    }
  }, [session]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/settings/family">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Family Members</CardTitle>
                  <CardDescription className="text-xs">Manage family brackets</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Card className="opacity-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-400">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription className="text-xs">Coming soon</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="opacity-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-400">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription className="text-xs">Coming soon</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <Input
                id="email"
                value={email}
                disabled
                className="bg-slate-50"
              />
            </div>
            <p className="text-xs text-slate-500">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Favorite Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Favorite Team
          </CardTitle>
          <CardDescription>
            Choose your favorite NCAA team to personalize the app&apos;s color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current selection + preview */}
          {favoriteTeam && (() => {
            const team = getTeamBySlug(favoriteTeam);
            if (!team) return null;
            const palette = generatePalette(team.primary, team.secondary);
            return (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Image src={team.logo} alt={team.name} width={36} height={36} className="rounded" />
                  <div>
                    <p className="font-semibold text-sm">{team.name}</p>
                    <div className="flex gap-1 mt-1">
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: palette.primary }} />
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: palette.accent }} />
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: palette.muted }} />
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setIsSavingTeam(true);
                    try {
                      const res = await fetch("/api/user/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ favoriteTeam: null }),
                      });
                      if (!res.ok) throw new Error();
                      setFavoriteTeam(null);
                      await update();
                      toast.success("Reset to default theme");
                    } catch {
                      toast.error("Failed to reset");
                    } finally {
                      setIsSavingTeam(false);
                    }
                  }}
                  disabled={isSavingTeam}
                >
                  <X className="h-4 w-4 mr-1" /> Reset
                </Button>
              </div>
            );
          })()}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Team grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto">
            {TEAMS
              .filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
              .map((team) => {
                const isSelected = favoriteTeam === team.slug;
                return (
                  <button
                    key={team.slug}
                    onClick={async () => {
                      setIsSavingTeam(true);
                      try {
                        const res = await fetch("/api/user/profile", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ favoriteTeam: team.slug }),
                        });
                        if (!res.ok) throw new Error();
                        setFavoriteTeam(team.slug);
                        await update();
                        toast.success(`Theme set to ${team.name}!`);
                      } catch {
                        toast.error("Failed to save");
                      } finally {
                        setIsSavingTeam(false);
                      }
                    }}
                    disabled={isSavingTeam}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all hover:shadow-md ${
                      isSelected ? "ring-2 ring-primary shadow-md border-primary" : "hover:border-foreground/20"
                    }`}
                  >
                    <Image
                      src={team.logo}
                      alt={team.name}
                      width={28}
                      height={28}
                      className="rounded flex-shrink-0"
                    />
                    <span className="truncate font-medium">{team.name}</span>
                  </button>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Account ID</span>
              <span className="font-mono text-xs">{session.user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Type</span>
              <span>Standard</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
