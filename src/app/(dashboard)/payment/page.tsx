"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Copy, DollarSign, ExternalLink, Loader2, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { paymentDetails, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod, type PoolPayment } from "@/lib/payment";

interface Entry {
  id: string;
  name: string;
  entryName: string;
  paid: boolean;
  latestPayment: { id: string; status: "PENDING" | "CONFIRMED" | "REJECTED"; method: string; note: string | null; createdAt: string } | null;
}

interface PaymentsData {
  pool: (PoolPayment & { id: string; name: string }) | null;
  entries: Entry[];
}

const entryState = (e: Entry) => (e.paid ? "paid" : e.latestPayment?.status === "PENDING" ? "pending" : e.latestPayment?.status === "REJECTED" ? "rejected" : "unpaid");

export default function PaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<PaymentsData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<PaymentMethod>("VENMO");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(
    () =>
      fetch("/api/payments")
        .then((res) => (res.ok ? res.json() : { pool: null, entries: [] }))
        .then((d: PaymentsData) => {
          setData(d);
          // Pre-select entries that still need paying
          setSelected(new Set(d.entries.filter((e) => ["unpaid", "rejected"].includes(entryState(e))).map((e) => e.id)));
        }),
    []
  );

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (status === "loading" || (session && !data)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (!session || !data) return null;

  const payment = paymentDetails(data.pool);
  const payable = data.entries.filter((e) => ["unpaid", "rejected"].includes(entryState(e)));
  const total = (Number(data.pool?.entryFee ?? 0) * selected.size).toFixed(2);

  const report = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bracketIds: [...selected], method, note: note || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't send");
      toast.success("Thanks! The admin will confirm your payment.");
      setNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Pay entry fee"
        description={`${payment.feeLabel} per entry${data.pool ? ` · ${data.pool.name}` : ""}. Send it with Venmo or PayPal, then tell us below.`}
      />

      {/* Payment options */}
      <div className="grid gap-4 md:grid-cols-2">
        {payment.venmoUrl && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Venmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 font-mono text-sm">@{payment.venmoHandle}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(payment.venmoHandle!);
                    toast.success("Venmo username copied");
                  }}
                  aria-label="Copy Venmo username"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a href={payment.venmoUrl} target="_blank" rel="noopener noreferrer">
                  Open Venmo <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
        {payment.paypalUrl && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">PayPal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="rounded-lg bg-muted p-2 text-sm">{payment.paypalLabel}</p>
              <Button asChild variant="outline" className="w-full">
                <a href={payment.paypalUrl} target="_blank" rel="noopener noreferrer">
                  Pay with PayPal <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
        {!payment.venmoUrl && !payment.paypalUrl && (
          <Card className="md:col-span-2">
            <CardContent className="pt-6 text-sm text-muted-foreground">Payment options haven&apos;t been set up for this pool yet. Check with the pool admin.</CardContent>
          </Card>
        )}
      </div>

      {/* Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Your entries
          </CardTitle>
          <CardDescription>After you send money, tick the entries it covers and let the admin know.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No submitted brackets yet.{" "}
              <Link href="/brackets/new" className="font-semibold text-primary">
                Fill one out →
              </Link>
            </p>
          )}
          <div className="divide-y rounded-lg border">
            {data.entries.map((e) => {
              const state = entryState(e);
              const canPick = state === "unpaid" || state === "rejected";
              return (
                <label key={e.id} className={cn("flex items-center gap-3 px-3 py-3", canPick && "cursor-pointer")}>
                  {canPick ? (
                    <Checkbox
                      checked={selected.has(e.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selected);
                        if (checked) next.add(e.id);
                        else next.delete(e.id);
                        setSelected(next);
                      }}
                    />
                  ) : (
                    <span className="w-4" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.entryName}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.name}</p>
                  </div>
                  {state === "paid" && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-green-600">
                      <CheckCircle className="h-4 w-4" /> Paid
                    </span>
                  )}
                  {state === "pending" && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <Clock className="h-4 w-4" /> Waiting for confirmation
                    </span>
                  )}
                  {state === "rejected" && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-red-600" title={e.latestPayment?.note ?? undefined}>
                      <XCircle className="h-4 w-4" /> Not found
                    </span>
                  )}
                  {state === "unpaid" && <span className="text-sm text-muted-foreground">{payment.feeLabel}</span>}
                </label>
              );
            })}
          </div>

          {payable.length > 0 && (
            <div className="space-y-3 rounded-lg bg-muted/50 p-3">
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div>
                  <Label className="text-xs">Paid with</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger className="mt-1 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-note" className="text-xs">
                    Note for the admin (optional)
                  </Label>
                  <Input
                    id="payment-note"
                    value={note}
                    maxLength={200}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Sent from @jsmith, covers both"
                    className="mt-1 bg-background"
                  />
                </div>
              </div>
              <Button className="w-full" disabled={!selected.size || sending} onClick={report}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                I&apos;ve paid ${total} for {selected.size} entr{selected.size === 1 ? "y" : "ies"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
