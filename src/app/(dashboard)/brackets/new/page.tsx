"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, CloudOff, Download, Loader2, Lock, Trash2, Trophy, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DesktopBracketView } from "@/components/bracket/DesktopBracketView";
import { MobilePicker } from "@/components/picker/mobile-picker";
import { PaymentDialog } from "@/components/picker/payment-dialog";
import type { PickerTeam } from "@/components/picker/game-picker";
import { useBracketEditor } from "@/hooks/use-bracket-editor";
import { useTournamentField } from "@/hooks/use-tournament-field";
import { cn } from "@/lib/utils";
import type { PoolPayment } from "@/lib/payment";
import { bracketGames, phoneSteps, progress, toPicks, type Picks } from "@/lib/picker";
import { parsePicksData } from "@/lib/scoring-engine";

interface FamilyMember {
  id: string;
  name: string;
}

interface Pool extends PoolPayment {
  id: string;
  deadline: string;
}

type BracketStatus = "DRAFT" | "SUBMITTED" | "PAID";

const AUTOSAVE_DELAY = 1500;

function celebrate() {
  const css = getComputedStyle(document.documentElement);
  const frame = ["--primary", "--team-secondary"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  const colors = [...frame, "#fbbf24", "#ffffff"];
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors });
  }, 250);
}

/** Picks from a photo-upload extraction (team names) mapped onto the field */
function picksFromUpload(extracted: { regions?: Record<string, Record<string, (string | null)[]>> }, regions: string[], teams: PickerTeam[]): Picks {
  const byName = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));
  const find = (name: string | null) => {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    if (byName.has(lower)) return byName.get(lower)!;
    for (const [key, id] of byName) if (key.includes(lower) || lower.includes(key)) return id;
    return null;
  };
  const picks: Picks = new Map();
  for (const region of regions) {
    const data = extracted.regions?.[region];
    if (!data) continue;
    ([["round1", 1, 8], ["round2", 2, 4], ["sweet16", 3, 2], ["elite8", 4, 1]] as const).forEach(([key, round, count]) => {
      (data[key] ?? []).slice(0, count).forEach((name, g) => {
        const teamId = find(name);
        const gameId = `${region}-r${round}-g${g + 1}`;
        if (teamId) picks.set(gameId, { gameId, round, choices: [teamId] });
      });
    });
  }
  return picks;
}

function BracketEditorPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [pool, setPool] = useState<Pool | null>(null);
  const [poolsLoaded, setPoolsLoaded] = useState(false);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [bracketId, setBracketId] = useState<string | null>(editId);
  const [bracketStatus, setBracketStatus] = useState<BracketStatus | null>(null);
  const [loaded, setLoaded] = useState(!editId);
  const [name, setName] = useState("My Bracket");
  const [person, setPerson] = useState("self");
  const [tiebreaker, setTiebreaker] = useState<number | "">("");
  const [metaVersion, setMetaVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const bracketIdRef = useRef<string | null>(editId);
  const loadedFor = useRef<string | null>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());

  const { field, loading: fieldLoading, error: fieldError } = useTournamentField(pool?.id ?? null, poolsLoaded);
  const regions = useMemo(() => field?.tournament.regions ?? [], [field]);
  const games = useMemo(() => (regions.length === 4 ? bracketGames(regions) : []), [regions]);
  const byId = useMemo(() => new Map(games.map((g) => [g.gameId, g])), [games]);
  const steps = useMemo(() => phoneSteps(games), [games]);
  const teams = useMemo(
    () => new Map((field?.teams ?? []).map((t) => [t.id, { id: t.id, name: t.name, seed: t.seed, logo: t.logo, record: t.record }] as const)),
    [field]
  );
  const team = useCallback((id: string): PickerTeam => teams.get(id) ?? { id, name: id, seed: 0, logo: null, record: null }, [teams]);

  const editor = useBracketEditor(games);
  const { picks, load } = editor;
  const editVersion = editor.version + metaVersion;
  const unsaved = editVersion !== savedVersion;
  const isSubmitted = bracketStatus === "SUBMITTED" || bracketStatus === "PAID";
  const locked = !!pool && new Date() > new Date(pool.deadline);
  const prog = progress(picks, games);
  const complete = games.length > 0 && prog.done === prog.total && tiebreaker !== "";
  const entryName = person === "self" ? session?.user?.name || "My Bracket" : family.find((m) => m.id === person)?.name || "Unknown";

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  // Pool (deadline, payment) and family members
  useEffect(() => {
    if (!session) return;
    Promise.all([fetch("/api/pools").then((r) => (r.ok ? r.json() : [])), fetch("/api/family-members").then((r) => (r.ok ? r.json() : []))])
      .then(([pools, members]: [Pool[], FamilyMember[]]) => {
        setPool(pools[0] ?? null);
        setFamily(members);
      })
      .catch(() => undefined)
      .finally(() => setPoolsLoaded(true));
  }, [session]);

  // Existing bracket
  useEffect(() => {
    if (!session || !editId || loadedFor.current === editId) return;
    loadedFor.current = editId;
    fetch(`/api/brackets/${editId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => {
        bracketIdRef.current = b.id;
        setBracketId(b.id);
        setBracketStatus(b.status);
        setName(b.name);
        if (b.tiebreaker != null) setTiebreaker(b.tiebreaker);
        if (b.familyMemberId) setPerson(b.familyMemberId);
        load(toPicks(parsePicksData(b.picksData)));
      })
      .catch(() => toast.error("Couldn't load that bracket"))
      .finally(() => setLoaded(true));
  }, [session, editId, load]);

  // Picks read from an uploaded bracket photo
  useEffect(() => {
    if (searchParams.get("fromUpload") !== "true" || !teams.size || regions.length !== 4) return;
    const stored = sessionStorage.getItem("extractedBracket");
    if (!stored) return;
    sessionStorage.removeItem("extractedBracket");
    try {
      const extracted = JSON.parse(stored);
      load(picksFromUpload(extracted, regions, [...teams.values()]));
      if (extracted.tiebreaker != null) setTiebreaker(extracted.tiebreaker);
      setMetaVersion((n) => n + 1); // treat imported picks as an edit so they're saved
      toast.success("Picks loaded from your photo. Check them before submitting.");
    } catch {
      toast.error("Couldn't read the uploaded bracket");
    }
  }, [searchParams, teams, regions, load]);

  const save = useCallback(
    (target: "DRAFT" | "SUBMITTED") => {
      const version = editVersion;
      const body = {
        name,
        entryName,
        poolId: pool?.id,
        familyMemberId: person === "self" ? null : person,
        tiebreaker: tiebreaker === "" ? null : tiebreaker,
        picks: [...picks.values()],
      };
      // Saves run one at a time so the first auto-save's new bracket ID is used by the next one
      const run = saveQueue.current.then(async () => {
        setSaving(true);
        try {
          const id = bracketIdRef.current;
          const res = await fetch(id ? `/api/brackets/${id}` : "/api/brackets", {
            method: id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, ...(target === "SUBMITTED" || !id ? { status: target } : {}) }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Couldn't save");
          if (!id) {
            bracketIdRef.current = data.id;
            loadedFor.current = data.id;
            setBracketId(data.id);
            window.history.replaceState(null, "", `/brackets/new?editId=${data.id}`);
          }
          setBracketStatus(data.status);
          setSavedVersion(version);
          setSaveError(null);
          return true;
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : "Couldn't save");
          if (target === "SUBMITTED") toast.error(e instanceof Error ? e.message : "Couldn't submit");
          return false;
        } finally {
          setSaving(false);
        }
      });
      saveQueue.current = run;
      return run;
    },
    [editVersion, name, entryName, pool?.id, person, tiebreaker, picks]
  );

  // Auto-save drafts shortly after each change. Submitted brackets save only via "Save changes"
  // (an incomplete edit can't be submitted, and auto-saving must never turn them back into drafts).
  useEffect(() => {
    if (!loaded || !unsaved || locked || isSubmitted || !pool) return;
    const timer = setTimeout(() => save("DRAFT"), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [loaded, unsaved, locked, isSubmitted, pool, save]);

  // Warn before closing the tab with unsaved changes; flush drafts when the page is hidden
  useEffect(() => {
    if (!unsaved && !saving) return;
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onHide = () => document.hidden && !isSubmitted && !locked && pool && save("DRAFT");
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [unsaved, saving, isSubmitted, locked, pool, save]);

  const submit = async () => {
    if (!complete) return;
    const firstSubmit = !isSubmitted;
    if (!(await save("SUBMITTED"))) return;
    if (!firstSubmit) {
      toast.success("Changes saved");
      return;
    }
    celebrate();
    toast.success("Bracket submitted! Good luck!");
    setShowPayment(true);
  };

  const leave = () => {
    if (unsaved || saving) setShowLeave(true);
    else router.push("/brackets");
  };

  const editMeta = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setMetaVersion((n) => n + 1);
  };

  if (authStatus === "loading" || !poolsLoaded || !loaded || (pool && fieldLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (!session) return null;
  if (!pool || !field || games.length === 0) {
    return (
      <Card className="mx-auto mt-12 max-w-lg">
        <CardHeader>
          <CardTitle>{pool ? "The bracket isn't ready yet" : "Join a pool first"}</CardTitle>
          <CardDescription>
            {pool ? fieldError ?? "Teams appear here once the tournament field is announced on Selection Sunday." : "You need to be in a pool to fill out a bracket."}
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button variant="outline" asChild>
            <Link href="/brackets">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> My brackets
            </Link>
          </Button>
        </div>
      </Card>
    );
  }
  if (locked) {
    return (
      <Card className="mx-auto mt-12 max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Brackets are locked
          </CardTitle>
          <CardDescription>Picks closed at tip-off. {bracketId ? "You can still view your bracket." : ""}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Button variant="outline" asChild>
            <Link href="/brackets">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> My brackets
            </Link>
          </Button>
          {bracketId && (
            <Button asChild>
              <Link href={`/brackets/${bracketId}`}>View bracket</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/game-center">Game Center</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const saveLabel = saving ? (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
    </span>
  ) : saveError ? (
    <span className="flex items-center gap-1 text-red-600" title={saveError}>
      <CloudOff className="h-3 w-3" /> Not saved
    </span>
  ) : unsaved ? (
    <span className="text-amber-600">{isSubmitted ? "Unsaved changes" : "Saving soon…"}</span>
  ) : bracketId ? (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Check className="h-3 w-3" /> {isSubmitted ? "Submitted" : "Draft saved"}
    </span>
  ) : null;

  const submitPanel = (
    <div className="space-y-3">
      <div>
        <Label htmlFor="tiebreaker" className="text-sm font-medium">
          Tiebreaker: total points in the championship game
        </Label>
        <Input
          id="tiebreaker"
          type="number"
          inputMode="numeric"
          min={0}
          max={400}
          placeholder="e.g. 145"
          value={tiebreaker}
          onChange={(e) => editMeta(setTiebreaker)(e.target.value === "" ? "" : Number(e.target.value))}
          className="mt-1.5"
        />
      </div>
      {!complete && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          {prog.total - prog.done > 0 ? `${prog.total - prog.done} game${prog.total - prog.done === 1 ? "" : "s"} left to pick` : "Add your tiebreaker to submit"}
        </p>
      )}
      <Button className="w-full" size="lg" disabled={!complete || saving} onClick={submit}>
        <Trophy className="mr-2 h-4 w-4" />
        {isSubmitted ? (unsaved ? "Save changes" : "Submitted") : "Submit bracket"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 max-md:sticky max-md:top-0 max-md:z-40 max-md:-mx-4 max-md:-mt-8 max-md:gap-2 max-md:border-b max-md:bg-background/95 max-md:px-2 max-md:pt-[calc(0.5rem+env(safe-area-inset-top))] max-md:pb-2 max-md:backdrop-blur">
        <Button variant="ghost" size="icon" onClick={leave} aria-label="Back to my brackets">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold sm:text-2xl md:text-3xl">{bracketId ? name : "New bracket"}</h1>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {prog.done} of {prog.total} games picked
            </span>
            {saveLabel}
          </div>
        </div>
        {isSubmitted && unsaved && (
          <Button size="sm" onClick={submit} disabled={!complete || saving} title={complete ? undefined : "Finish every game to save"}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            {complete ? "Save changes" : "Finish to save"}
          </Button>
        )}
        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="outline" size="sm" onClick={editor.undo} disabled={!editor.canUndo}>
            <Undo2 className="mr-1.5 h-4 w-4" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowClear(true)} disabled={!picks.size}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/tournament/blank-pdf?poolId=${encodeURIComponent(pool.id)}`} download={`${field.tournament.year}-bracket.pdf`}>
              <Download className="mr-1.5 h-4 w-4" /> Blank PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(prog.done / prog.total) * 100}%` }} />
      </div>

      {/* Bracket details (collapsed on phones so the picks stay on screen) */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm lg:hidden"
        aria-expanded={showDetails}
      >
        <span className="truncate">
          <span className="font-semibold">{name}</span>
          <span className="text-muted-foreground"> · for {entryName}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-primary">{showDetails ? "Done" : "Edit"}</span>
      </button>
      <div className={cn("grid gap-3 sm:grid-cols-2", !showDetails && "hidden lg:grid")}>
        <div>
          <Label htmlFor="bracket-name" className="text-xs text-muted-foreground">
            Bracket name
          </Label>
          <Input id="bracket-name" value={name} maxLength={100} onChange={(e) => editMeta(setName)(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Entry for</Label>
          <Select value={person} onValueChange={editMeta(setPerson)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">{session.user?.name || "Myself"}</SelectItem>
              {family.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop: the whole bracket */}
      <div className="hidden space-y-5 lg:block">
        <DesktopBracketView regions={regions} picks={picks} byId={byId} team={team} onTap={editor.tap} onReorder={editor.reorder} />
        <div className="mx-auto max-w-md rounded-xl border bg-card p-5 shadow-sm">{submitPanel}</div>
      </div>

      {/* Phones and tablets: one card at a time */}
      <div className="lg:hidden">
        <MobilePicker
          steps={steps}
          regions={regions}
          picks={picks}
          byId={byId}
          team={team}
          onTap={editor.tap}
          onReorder={editor.reorder}
          onUndo={editor.undo}
          canUndo={editor.canUndo}
          finale={submitPanel}
        />
        <div className="mt-4 flex justify-center gap-4 text-xs">
          <button type="button" onClick={() => setShowClear(true)} disabled={!picks.size} className="text-muted-foreground underline disabled:opacity-40">
            Clear all picks
          </button>
          <a href={`/api/tournament/blank-pdf?poolId=${encodeURIComponent(pool.id)}`} className="text-muted-foreground underline">
            Blank bracket PDF
          </a>
        </div>
      </div>

      <Dialog open={showClear} onOpenChange={setShowClear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all picks?</DialogTitle>
            <DialogDescription>This removes every pick in this bracket. You can undo it right after.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                editor.clear(() => false);
                setShowClear(false);
                toast("All picks cleared", { action: { label: "Undo", onClick: editor.undo } });
              }}
            >
              Clear all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeave} onOpenChange={setShowLeave}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isSubmitted ? "Save your changes?" : "Save draft before leaving?"}</DialogTitle>
            <DialogDescription>
              {isSubmitted
                ? complete
                  ? "Your submitted bracket has changes that aren't saved yet."
                  : "Your changes leave the bracket incomplete, so they can't be saved to your submitted bracket. Finish it or discard the changes."
                : "Your latest picks haven't been saved yet."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLeave(false)}>
              Keep editing
            </Button>
            <Button variant="ghost" onClick={() => router.push("/brackets")}>
              {isSubmitted ? "Discard changes" : "Leave without saving"}
            </Button>
            {(!isSubmitted || complete) && (
              <Button
                onClick={async () => {
                  if (await save(isSubmitted ? "SUBMITTED" : "DRAFT")) router.push("/brackets");
                }}
              >
                {isSubmitted ? "Save changes" : "Save draft"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={showPayment}
        pool={pool}
        entryName={entryName}
        onDone={() => {
          setShowPayment(false);
          router.push("/brackets");
        }}
      />
      <span className="sr-only" aria-live="polite">
        {saving ? "Saving" : unsaved ? "Unsaved changes" : "Saved"}
      </span>
    </div>
  );
}

export default function NewBracketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <BracketEditorPage />
    </Suspense>
  );
}
