"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Crown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SeasonPool {
  id: string;
  name: string;
  status: string;
  deadline: string;
  entryFee: string;
  year: number;
  members: number;
  brackets: number;
}

interface SeasonTournament {
  id: string;
  year: number;
  name: string;
  startDate: string;
  pools: number;
  teams: number;
}

interface HofEntry {
  id: string;
  year: number;
  place: number;
  name: string;
  score: number | null;
  note: string | null;
}

/** datetime-local value in the browser's time zone */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function AdminSeasonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ pools: SeasonPool[]; tournaments: SeasonTournament[] } | null>(null);
  const [fromPoolId, setFromPoolId] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fee, setFee] = useState("");
  const [emailMembers, setEmailMembers] = useState(true);
  const [closeOld, setCloseOld] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [hof, setHof] = useState<HofEntry[]>([]);
  const [hofForm, setHofForm] = useState({ year: "", place: "1", name: "", score: "", note: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "ADMIN") router.push("/dashboard");
  }, [status, session, router]);

  function applyLoaded(season: { pools: SeasonPool[]; tournaments: SeasonTournament[] }, entries: HofEntry[]) {
    setData(season);
    setHof(entries);
    const from: SeasonPool | undefined = season.pools[0];
    const next: SeasonTournament | undefined = season.tournaments.find((t: SeasonTournament) => t.pools === 0 && (!from || t.year > from.year));
    setFromPoolId(from?.id ?? "");
    setTournamentId(next?.id ?? "");
    setName(next ? `${next.year} NCAA Tournament` : "");
    setDeadline(next ? toLocalInput(next.startDate) : "");
    setFee(from?.entryFee ?? "5");
  }

  const load = useCallback(
    () =>
      Promise.all([
        fetch("/api/admin/season").then((r) => (r.ok ? r.json() : { pools: [], tournaments: [] })),
        fetch("/api/admin/hall-of-fame").then((r) => (r.ok ? r.json() : [])),
      ]).then(([season, entries]) => applyLoaded(season, entries)),
    []
  );


  useEffect(() => {
    if (session?.user?.role === "ADMIN") load();
  }, [session, load]);

  if (status === "loading" || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const from = data.pools.find((p) => p.id === fromPoolId);
  const candidates = data.tournaments.filter((t) => t.pools === 0 && (!from || t.year > from.year));
  const target = data.tournaments.find((t) => t.id === tournamentId);

  const start = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/admin/season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPoolId,
          tournamentId,
          name,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          entryFee: fee === "" ? undefined : Number(fee),
          emailMembers,
          closeOldPool: closeOld,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't start the season");
      toast.success(`${name} started with ${body.members} members${emailMembers ? `; ${body.emailed} emails sent` : ""}. Invite code ${body.inviteCode}.`);
      setConfirming(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start the season");
    } finally {
      setStarting(false);
    }
  };

  const saveHof = async () => {
    const res = await fetch("/api/admin/hall-of-fame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: Number(hofForm.year),
        place: Number(hofForm.place),
        name: hofForm.name,
        score: hofForm.score === "" ? null : Number(hofForm.score),
        note: hofForm.note || null,
      }),
    });
    const body = await res.json();
    if (!res.ok) return toast.error(body.error || "Couldn't save");
    toast.success(`Saved ${hofForm.year} #${hofForm.place}`);
    setHofForm({ ...hofForm, place: String(Math.min(3, Number(hofForm.place) + 1)), name: "", score: "", note: "" });
    setHof(await fetch("/api/admin/hall-of-fame").then((r) => r.json()));
  };

  const deleteHof = async (id: string) => {
    await fetch(`/api/admin/hall-of-fame?id=${id}`, { method: "DELETE" });
    setHof(hof.filter((h) => h.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">New Season</h1>
          <p className="text-muted-foreground">Start next year&apos;s pool and keep the Hall of Fame up to date</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Start a new season
          </CardTitle>
          <CardDescription>
            Creates a pool for the new tournament with the same entry fee and payment details, adds every member of the old pool, and lets them know.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.length === 0 ? (
            <p className="rounded-lg border bg-secondary px-3 py-2 text-sm">
              First import next year&apos;s bracket under{" "}
              <Link href="/admin/tournament" className="font-semibold text-primary">
                Admin → Tournament
              </Link>{" "}
              (after Selection Sunday). Then come back here.
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Copy members and settings from</Label>
                  <Select value={fromPoolId} onValueChange={setFromPoolId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.pools.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.year}, {p.members} members)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>New tournament</Label>
                  <Select
                    value={tournamentId}
                    onValueChange={(id) => {
                      const t = data.tournaments.find((x) => x.id === id);
                      setTournamentId(id);
                      if (t) {
                        setName(`${t.year} NCAA Tournament`);
                        setDeadline(toLocalInput(t.startDate));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a tournament" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season-name">Pool name</Label>
                  <Input id="season-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="season-deadline">Picks lock</Label>
                    <Input id="season-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="season-fee">Entry fee ($)</Label>
                    <Input id="season-fee" type="number" min={0} step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox checked={emailMembers} onCheckedChange={(v) => setEmailMembers(!!v)} />
                  Email members that brackets are open (skips anyone who unsubscribed)
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={closeOld} onCheckedChange={(v) => setCloseOld(!!v)} />
                  Close {from?.name ?? "the old pool"} (its standings and Hall of Fame entry stay)
                </label>
              </div>
              <Button onClick={() => setConfirming(true)} disabled={!fromPoolId || !tournamentId || name.trim().length < 2}>
                Start {target?.year ?? "new"} season
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" /> Hall of Fame: past years
          </CardTitle>
          <CardDescription>
            Seasons played in the app are added automatically when the final ends. Add earlier winners here. An entry for a year replaces that year&apos;s
            computed podium.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[90px_90px_1fr_90px_1fr_auto]">
            <Input placeholder="Year" type="number" value={hofForm.year} onChange={(e) => setHofForm({ ...hofForm, year: e.target.value })} />
            <Select value={hofForm.place} onValueChange={(place) => setHofForm({ ...hofForm, place })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st</SelectItem>
                <SelectItem value="2">2nd</SelectItem>
                <SelectItem value="3">3rd</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Name" value={hofForm.name} onChange={(e) => setHofForm({ ...hofForm, name: e.target.value })} />
            <Input placeholder="Points" type="number" value={hofForm.score} onChange={(e) => setHofForm({ ...hofForm, score: e.target.value })} />
            <Input placeholder="Note (optional)" value={hofForm.note} onChange={(e) => setHofForm({ ...hofForm, note: e.target.value })} />
            <Button onClick={saveHof} disabled={!hofForm.year || !hofForm.name.trim()}>
              Save
            </Button>
          </div>
          {hof.length > 0 && (
            <div className="divide-y rounded-lg border">
              {hof.map((h) => (
                <div key={h.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-12 font-semibold">{h.year}</span>
                  <span className="w-8 text-muted-foreground">#{h.place}</span>
                  <span className="flex-1 font-medium">{h.name}</span>
                  {h.score != null && <span className="text-muted-foreground">{h.score} pts</span>}
                  {h.note && <span className="hidden truncate text-xs text-muted-foreground md:inline">{h.note}</span>}
                  <Button variant="ghost" size="icon" onClick={() => deleteHof(h.id)} aria-label={`Delete ${h.year} #${h.place}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start {name}?</DialogTitle>
            <DialogDescription>
              {from?.members ?? 0} members will be added{emailMembers ? " and emailed" : ""}.
              {closeOld && from ? ` ${from.name} will be closed.` : ""} This can&apos;t be undone from the app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={start} disabled={starting}>
              {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Start season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
