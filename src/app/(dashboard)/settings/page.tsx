"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Save, Users, Bell, Shield, Heart, X, Search } from "lucide-react";
import { toast } from "sonner";
import { TEAM_LIST, getTeamColor, DEFAULT_TEAM_COLOR } from "@/lib/team-colors";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const { update: updateSession } = useSession();

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

  const handleTeamSave = async (slug: string | null) => {
    setFavoriteTeam(slug);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteTeam: slug }),
      });
      if (!response.ok) throw new Error("Failed to save");
      await updateSession();
      const team = getTeamColor(slug);
      toast.success(slug ? `Theme set to ${team.name} colors!` : "Reset to default colors");
    } catch {
      toast.error("Failed to update team");
    }
  };

  const selectedTeamColor = getTeamColor(favoriteTeam);
  const filteredTeams = TEAM_LIST.filter((t) =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
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
            className="bg-[var(--team-primary)] hover:bg-[var(--team-secondary)]"
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
            <Heart className="h-5 w-5" />
            Favorite Team
          </CardTitle>
          <CardDescription>
            Pick your favorite NCAA team to customize the app&apos;s accent color
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current selection preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            {favoriteTeam ? (
              <>
                <Image
                  src={selectedTeamColor.logo}
                  alt={selectedTeamColor.name}
                  width={40}
                  height={40}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{selectedTeamColor.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: selectedTeamColor.primary }} />
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: selectedTeamColor.secondary }} />
                    <span className="text-xs text-muted-foreground">Active theme colors</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTeamSave(null)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: DEFAULT_TEAM_COLOR.primary }}>
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Pick N Roll Default</p>
                  <p className="text-xs text-muted-foreground">Select a team below to customize</p>
                </div>
              </div>
            )}
          </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
            {filteredTeams.map((team) => {
              const isSelected = favoriteTeam === team.slug;
              return (
                <button
                  key={team.slug}
                  onClick={() => handleTeamSave(team.slug)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all hover:shadow-md ${
                    isSelected
                      ? "ring-2 ring-offset-1 shadow-md"
                      : "hover:border-foreground/20"
                  }`}
                  style={isSelected ? { borderColor: team.primary, boxShadow: `0 0 0 2px ${team.primary}` } : {}}
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
