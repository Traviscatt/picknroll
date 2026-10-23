"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowLeft, CheckCircle, Download, Loader2, Lock, Upload } from "lucide-react";
import { toast } from "sonner";
import type { EspnField, EspnFieldTeam } from "@/lib/espn-field";

interface TournamentSummary {
  id: string;
  name: string;
  year: number;
  regions: string[];
  startDate: string;
  teams: number;
  games: number;
  pools: number;
  locked: boolean;
}

interface Preview {
  year: number;
  name: string;
  startDate: string | null;
  field: EspnField;
  existing: { id: string; name: string; teams: number; games: number; pools: number; locked: boolean } | null;
}

// Selection Sunday is four days before the third Thursday of March (Round 1)
function defaultSelectionSunday(today = new Date()) {
  const year = today.getMonth() >= 4 ? today.getFullYear() + 1 : today.getFullYear();
  const march1 = new Date(Date.UTC(year, 2, 1));
  const firstThursday = 1 + ((4 - march1.getUTCDay() + 7) % 7);
  return new Date(Date.UTC(year, 2, firstThursday + 14 - 4)).toISOString().slice(0, 10);
}

export default function AdminTournamentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<TournamentSummary[] | null>(null);
  const [selectionSunday, setSelectionSunday] = useState(defaultSelectionSunday);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "ADMIN") router.push("/dashboard");
  }, [status, session, router]);

  const loadTournaments = () =>
    fetch("/api/admin/tournament")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTournaments)
      .catch(() => setTournaments([]));

  useEffect(() => {
    if (session?.user?.role === "ADMIN") loadTournaments();
  }, [session]);

  const handleFetch = async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/admin/tournament/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectionSunday }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to read ESPN");
      setPreview(data);
      setRegions(data.field.regions);
      setName(data.existing?.name ?? data.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read ESPN");
    } finally {
      setIsFetching(false);
    }
  };

  const updateSchool = (espnId: string, school: string) => {
    if (!preview) return;
    const rename = (t: EspnFieldTeam | null) => (t && t.espnId === espnId ? { ...t, school } : t);
    setPreview({
      ...preview,
      field: { ...preview.field, slots: preview.field.slots.map((s) => ({ ...s, team: rename(s.team)!, playIn: rename(s.playIn) })) },
    });
  };

  // The Final Four pairs regions[0] with regions[1]; picking an opponent reorders the rest
  const setFinalFourOpponent = (opponent: string) => {
    const [first, ...others] = regions;
    setRegions([first, opponent, ...others.filter((r) => r !== opponent)]);
  };

  const handlePublish = async () => {
    if (!preview?.startDate) return;
    setIsPublishing(true);
    try {
      const res = await fetch("/api/admin/tournament/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: preview.year,
          name,
          regions,
          startDate: preview.startDate,
          slots: preview.field.slots,
          r1GameIds: preview.field.r1GameIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success(data.message);
      setPreview(null);
      loadTournaments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsPublishing(false);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const problems = preview?.field.problems ?? [];
  const canPublish = !!preview && problems.length === 0 && !!preview.startDate && name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tournament</h1>
          <p className="text-slate-600">Import the bracket from ESPN after Selection Sunday</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournaments</CardTitle>
          <CardDescription>Pools pick from these. Team names and seeds in every bracket come from here.</CardDescription>
        </CardHeader>
        <CardContent>
          {tournaments === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : tournaments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tournaments yet. Import one below.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {tournaments.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.teams} teams · {t.games} games · {t.pools} pool{t.pools === 1 ? "" : "s"} · Round 1{" "}
                      {new Date(t.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      {t.regions.length === 4 && ` · Final Four: ${t.regions[0]}–${t.regions[1]}, ${t.regions[2]}–${t.regions[3]}`}
                    </p>
                  </div>
                  {t.locked ? (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" /> Brackets submitted
                    </Badge>
                  ) : (
                    <Badge variant="outline">Open for changes</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import from ESPN</CardTitle>
          <CardDescription>
            Reads the First Four and Round 1 games from the week after Selection Sunday. You can review and fix names before saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="selection-sunday">Selection Sunday</Label>
            <Input id="selection-sunday" type="date" value={selectionSunday} onChange={(e) => setSelectionSunday(e.target.value)} className="w-48" />
          </div>
          <Button onClick={handleFetch} disabled={isFetching || !selectionSunday}>
            {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {isFetching ? "Reading ESPN..." : "Fetch bracket"}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Review {preview.year} field</CardTitle>
            <CardDescription>
              {preview.existing
                ? preview.existing.locked
                  ? "This tournament already has submitted brackets. Saving updates names, logos, colors, records, and First Four results only."
                  : "This tournament already exists. Saving updates it in place; existing brackets keep their picks."
                : "This creates the tournament with 64 teams and 63 games."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {problems.length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> ESPN&apos;s data isn&apos;t complete yet
                </p>
                {problems.map((p) => (
                  <p key={p}>• {p}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> 4 regions, 64 teams, every Round 1 game found.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tournament-name">Name</Label>
                <Input id="tournament-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Round 1 tip-off</Label>
                <p className="text-sm py-2">
                  {preview.startDate ? new Date(preview.startDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not found"}
                </p>
              </div>
            </div>

            {regions.length === 4 && (
              <div className="space-y-2">
                <Label>Final Four pairing</Label>
                <p className="text-xs text-muted-foreground">ESPN doesn&apos;t include this. Check the printed bracket.</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{regions[0]}</span> vs
                  <Select value={regions[1]} onValueChange={setFinalFourOpponent}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.slice(1).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground mx-2">and</span>
                  <span className="font-medium">
                    {regions[2]} vs {regions[3]}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {regions.map((region) => (
                <div key={region} className="rounded-lg border">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary border-b bg-muted/40">{region}</p>
                  <div className="divide-y">
                    {preview.field.slots
                      .filter((s) => s.region === region)
                      .map((slot) => (
                        <div key={slot.seed} className="px-2 py-1.5 space-y-1">
                          {[slot.team, slot.playIn].filter((t): t is EspnFieldTeam => t !== null).map((team, i) => (
                            <div key={team.espnId} className="flex items-center gap-2">
                              <span className="w-5 text-right text-xs text-muted-foreground">{i === 0 ? slot.seed : ""}</span>
                              {team.logo ? (
                                <Image src={team.logo} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" unoptimized />
                              ) : (
                                <span className="h-[18px] w-[18px]" />
                              )}
                              <Input
                                value={team.school}
                                onChange={(e) => updateSchool(team.espnId, e.target.value)}
                                className="h-7 px-2 text-sm"
                                title={team.name}
                              />
                              <span className="w-12 shrink-0 text-right text-[10px] text-muted-foreground">{team.record}</span>
                            </div>
                          ))}
                          {slot.playIn && <p className="pl-7 text-[10px] text-amber-700">First Four, not played yet</p>}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={!canPublish || isPublishing}>
                {isPublishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {preview.existing ? "Save changes" : "Create tournament"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
