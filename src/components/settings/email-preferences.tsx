"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type Prefs = { reminderEmails: boolean; tipoffEmails: boolean };

/** Which reminder emails this member gets (in-app notifications are unaffected) */
export function EmailPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && setPrefs({ reminderEmails: u.reminderEmails, tipoffEmails: u.tipoffEmails }))
      .catch(() => undefined);
  }, []);

  const update = async (patch: Partial<Prefs>) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (res.ok) toast.success("Email settings saved");
    else {
      setPrefs(previous);
      toast.error("Couldn't save");
    }
  };

  const row = (key: keyof Prefs, title: string, description: string) => (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={prefs?.[key] ?? false} disabled={!prefs} onCheckedChange={(v) => update({ [key]: v })} aria-label={title} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" /> Emails
        </CardTitle>
        <CardDescription>Account emails like password resets always arrive.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {row("reminderEmails", "Reminders and recaps", "Deadline and payment reminders, new-season news, and the daily tournament recap.")}
        {row("tipoffEmails", "Your team tips off", "An email shortly before your favorite team plays. You'll get an in-app note either way.")}
      </CardContent>
    </Card>
  );
}
