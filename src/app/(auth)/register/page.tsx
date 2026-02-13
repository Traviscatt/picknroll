"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { TEAMS } from "@/lib/team-colors";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const filteredTeams = useMemo(() => {
    if (!teamSearch) return TEAMS;
    const q = teamSearch.toLowerCase();
    return TEAMS.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamSearch]);

  const selectedTeam = TEAMS.find((t) => t.slug === favoriteTeam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, ...(favoriteTeam ? { favoriteTeam } : {}) }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">
              Pick<span className="text-primary">N</span>Roll
            </span>
          </Link>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Join the pool and start making your picks
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Favorite Team Picker */}
            <div className="space-y-2">
              <Label>Favorite Team <span className="text-muted-foreground text-xs">(optional)</span></Label>
              {selectedTeam ? (
                <div className="flex items-center gap-3 p-2.5 border rounded-md bg-slate-50">
                  <Image
                    src={selectedTeam.logo}
                    alt={selectedTeam.name}
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                    unoptimized
                  />
                  <span className="font-medium text-sm flex-1">{selectedTeam.name}</span>
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: selectedTeam.primary }} />
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: selectedTeam.secondary }} />
                  <button
                    type="button"
                    title="Clear team selection"
                    onClick={() => { setFavoriteTeam(""); setShowTeamPicker(false); }}
                    className="text-slate-400 hover:text-slate-600 ml-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTeamPicker(!showTeamPicker)}
                  className="w-full flex items-center gap-2 p-2.5 border rounded-md text-sm text-muted-foreground hover:border-slate-400 transition-colors text-left"
                >
                  <Trophy className="h-4 w-4" />
                  Choose your favorite team...
                </button>
              )}
              {showTeamPicker && !selectedTeam && (
                <div className="border rounded-md overflow-hidden">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search teams..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="pl-9 rounded-none border-0 border-b focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredTeams.map((team) => (
                      <button
                        key={team.slug}
                        type="button"
                        onClick={() => {
                          setFavoriteTeam(team.slug);
                          setShowTeamPicker(false);
                          setTeamSearch("");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left text-sm transition-colors"
                      >
                        <Image
                          src={team.logo}
                          alt={team.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 object-contain shrink-0"
                          unoptimized
                        />
                        <span className="font-medium">{team.name}</span>
                        <div className="ml-auto flex gap-1">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: team.primary }} />
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: team.secondary }} />
                        </div>
                      </button>
                    ))}
                    {filteredTeams.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">No teams found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
