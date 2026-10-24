"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payment";

interface ReportedPayment {
  id: string;
  amount: string;
  method: PaymentMethod;
  note: string | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  user: { name: string; email: string };
  bracket: { id: string; name: string; entryName: string; paid: boolean } | null;
}

const TABS = [
  { status: "PENDING", label: "To confirm" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "REJECTED", label: "Rejected" },
] as const;

export default function AdminPaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["status"]>("PENDING");
  const [payments, setPayments] = useState<ReportedPayment[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<ReportedPayment | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "ADMIN") router.push("/dashboard");
  }, [status, session, router]);

  const load = useCallback(
    (which: string) =>
      fetch(`/api/admin/payments?status=${which}`)
        .then((res) => (res.ok ? res.json() : []))
        .then(setPayments),
    []
  );

  useEffect(() => {
    if (session?.user?.role === "ADMIN") load(tab);
  }, [session, tab, load]);

  const act = async (payment: ReportedPayment, action: "confirm" | "reject", why?: string) => {
    setBusy(payment.id);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: why || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      toast.success(action === "confirm" ? `${payment.bracket?.entryName ?? "Entry"} marked paid` : "Payment rejected; the member was notified");
      setPayments((list) => list?.filter((p) => p.id !== payment.id) ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const pendingTotal = tab === "PENDING" ? (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Payments</h1>
          <p className="text-muted-foreground">Members report payments here. Check Venmo/PayPal, then confirm or reject.</p>
        </div>
      </div>

      <div className="flex w-full max-w-md gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.status}
            type="button"
            onClick={() => {
              setPayments(null);
              setTab(t.status);
            }}
            className={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-medium", tab === t.status ? "bg-background shadow" : "text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {payments === null ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{tab === "PENDING" ? "Nothing to confirm right now." : "None yet."}</p>
          ) : (
            <div className="divide-y">
              {tab === "PENDING" && (
                <p className="px-4 py-2.5 text-xs text-muted-foreground">
                  {payments.length} to confirm · ${pendingTotal.toFixed(2)} total
                </p>
              )}
              {payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {p.bracket?.entryName ?? "Deleted entry"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{p.bracket?.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.user.name} · {p.user.email} · {PAYMENT_METHOD_LABELS[p.method] ?? p.method} · ${Number(p.amount).toFixed(2)} ·{" "}
                      {new Date(p.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                    {p.note && <p className="mt-1 text-sm">&ldquo;{p.note}&rdquo;</p>}
                  </div>
                  {tab === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => setRejecting(p)}>
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                      <Button size="sm" disabled={busy === p.id} onClick={() => act(p, "confirm")}>
                        {busy === p.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Confirm
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this payment?</DialogTitle>
            <DialogDescription>
              {rejecting?.user.name} will be told the payment for {rejecting?.bracket?.entryName} couldn&apos;t be found and can report it again.
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional), e.g. No Venmo payment from this name" />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejecting) act(rejecting, "reject", reason);
                setRejecting(null);
                setReason("");
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
