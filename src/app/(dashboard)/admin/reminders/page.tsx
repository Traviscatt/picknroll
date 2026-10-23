"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ReminderType } from "@/lib/reminders";

interface ReminderRow {
  type: ReminderType;
  enabled: boolean;
  config: Record<string, number | number[]>;
  label: string;
  description: string;
  sent: number;
}

interface RunResult {
  type: ReminderType;
  enabled: boolean;
  recipients: number;
  emailed: number;
}

const listText = (v: unknown) => (Array.isArray(v) ? v.join(", ") : "");
const parseList = (text: string) =>
  text
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"} ET`;

function ReminderCard({ row, onSaved }: { row: ReminderRow; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(row.enabled);
  const [text, setText] = useState(() => {
    if (row.type === "DEADLINE") return listText(row.config.hoursBefore);
    if (row.type === "UNPAID") return listText(row.config.daysAfterLock);
    if (row.type === "TIPOFF") return String(row.config.minutesBefore);
    return String(row.config.hourET);
  });
  const [saving, setSaving] = useState(false);

  const config = () => {
    if (row.type === "DEADLINE") return { hoursBefore: parseList(text) };
    if (row.type === "UNPAID") return { daysAfterLock: parseList(text) };
    if (row.type === "TIPOFF") return { minutesBefore: Number(text) };
    return { hourET: Number(text) };
  };

  const save = async (nextEnabled = enabled) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: row.type, enabled: nextEnabled, config: config() }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${row.label} ${nextEnabled ? "on" : "off"}`);
      onSaved();
    } catch {
      toast.error("Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const timing =
    row.type === "DEADLINE" ? (
      <TimingInput label="Hours before picks lock" hint="e.g. 48, 3 (each sends once)" value={text} onChange={setText} />
    ) : row.type === "UNPAID" ? (
      <TimingInput label="Days after picks lock" hint="0 = at lock; e.g. 0, 7" value={text} onChange={setText} />
    ) : row.type === "TIPOFF" ? (
      <TimingInput label="Minutes before tip-off" hint="10–240 (checked every 10 minutes)" value={text} onChange={setText} />
    ) : (
      <div className="space-y-1.5">
        <Label className="text-xs">Send at</Label>
        <Select value={text} onValueChange={setText}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => i + 5).map((h) => (
              <SelectItem key={h} value={String(h)}>
                {hourLabel(h)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{row.label}</CardTitle>
          <CardDescription>{row.description}</CardDescription>
        </div>
        <Switch
          checked={enabled}
          disabled={saving}
          onCheckedChange={(v) => {
            setEnabled(v);
            save(v);
          }}
          aria-label={`${row.label} on or off`}
        />
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        {timing}
        <Button variant="outline" size="sm" onClick={() => save()} disabled={saving}>
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save timing
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">{row.sent} sent so far</span>
      </CardContent>
    </Card>
  );
}

function TimingInput({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-48" />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function AdminRemindersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<ReminderRow[] | null>(null);
  const [result, setResult] = useState<{ dryRun: boolean; rows: RunResult[] } | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "ADMIN") router.push("/dashboard");
  }, [status, session, router]);

  const load = useCallback(
    () =>
      fetch("/api/admin/reminders")
        .then((r) => (r.ok ? r.json() : []))
        .then(setRows),
    []
  );

  useEffect(() => {
    if (session?.user?.role === "ADMIN") load();
  }, [session, load]);

  const run = async (dryRun: boolean) => {
    if (!dryRun && !confirm("Send every reminder that's due right now?")) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/reminders/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dryRun }) });
      setResult({ dryRun, rows: await res.json() });
      if (!dryRun) load();
    } finally {
      setRunning(false);
    }
  };

  if (status === "loading" || !rows) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const label = (t: ReminderType) => rows.find((r) => r.type === t)?.label ?? t;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">
            Automatic reminders run every 10 minutes during March and April. Each is sent once per person, and members can unsubscribe from emails.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <ReminderCard key={row.type} row={row} onSaved={load} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Check now</CardTitle>
          <CardDescription>See who would get a reminder right now (nothing is sent), or send what&apos;s due without waiting for the schedule.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => run(true)} disabled={running}>
              <Search className="mr-1.5 h-4 w-4" /> Check what&apos;s due
            </Button>
            <Button onClick={() => run(false)} disabled={running}>
              {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Send due now
            </Button>
          </div>
          {result && (
            <div className="divide-y rounded-lg border text-sm">
              {result.rows.map((r) => (
                <div key={r.type} className="flex items-center justify-between px-3 py-2">
                  <span>{label(r.type)}</span>
                  <span className="text-muted-foreground">
                    {!r.enabled
                      ? "Off"
                      : result.dryRun
                        ? `${r.recipients} would get it (${r.emailed} by email)`
                        : `${r.recipients} sent (${r.emailed} emails)`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
