"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  ExternalLink,
  CheckCircle,
  Copy,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { paymentDetails, type PoolPayment } from "@/lib/payment";

export default function PaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasPaid, setHasPaid] = useState(false);
  const [pool, setPool] = useState<PoolPayment | null | undefined>(undefined);
  const payment = paymentDetails(pool);

  // Fee and payment links come from the user's pool
  useEffect(() => {
    if (!session) return;
    fetch("/api/pools")
      .then((res) => (res.ok ? res.json() : []))
      .then((pools: PoolPayment[]) => setPool(pools[0] ?? null))
      .catch(() => setPool(null));
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleCopyVenmo = () => {
    if (!payment.venmoHandle) return;
    navigator.clipboard.writeText(payment.venmoHandle);
    toast.success("Venmo username copied!");
  };

  const handleMarkAsPaid = async () => {
    // TODO: Submit payment confirmation to API
    setHasPaid(true);
    toast.success("Payment marked as pending! Admin will confirm shortly.");
  };

  if (status === "loading" || (session && pool === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Pay Entry Fee</h1>
        <p className="text-slate-600 mt-1">
          Complete your payment to finalize your bracket entry
        </p>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Entry Fee</span>
              <span className="font-semibold">{payment.feeLabel}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Due</span>
              <span className="font-bold text-primary">{payment.feeLabel}</span>
            </div>
          </div>

          {hasPaid && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700 text-sm">
                Payment submitted! Awaiting admin confirmation.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Options */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* PayPal */}
        {payment.paypalUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PayPal</CardTitle>
            <CardDescription>
              Pay instantly with PayPal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-20 bg-blue-50 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">PayPal</span>
            </div>
            <Button
              asChild
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={hasPaid}
            >
              <a
                href={payment.paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pay with PayPal
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Opens PayPal in a new tab
            </p>
          </CardContent>
        </Card>
        )}

        {/* Venmo */}
        {payment.venmoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Venmo</CardTitle>
            <CardDescription>
              Send payment via Venmo app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-20 bg-cyan-50 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-cyan-600">Venmo</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
              <Smartphone className="h-4 w-4 text-slate-500" />
              <span className="font-mono text-sm flex-1">@{payment.venmoHandle}</span>
              <Button variant="ghost" size="sm" onClick={handleCopyVenmo}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full border-cyan-500 text-cyan-600 hover:bg-cyan-50"
              disabled={hasPaid}
            >
              <a
                href={payment.venmoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Venmo
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Include &quot;PickNRoll&quot; in payment note
            </p>
          </CardContent>
        </Card>
        )}
        {!payment.paypalUrl && !payment.venmoUrl && (
          <Card className="md:col-span-2">
            <CardContent className="pt-6 text-sm text-slate-600">
              Payment options haven&apos;t been set up for this pool yet. Check with the pool admin.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Confirm Your Payment</CardTitle>
          <CardDescription>
            After sending payment, click below to notify the pool admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleMarkAsPaid}
            disabled={hasPaid}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {hasPaid ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Payment Submitted
              </>
            ) : (
              "I've Sent My Payment"
            )}
          </Button>
          <p className="text-xs text-slate-500 text-center mt-3">
            Your bracket status will be updated once the admin confirms receipt
          </p>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Payment Status</span>
            <Badge
              variant={hasPaid ? "default" : "outline"}
              className={hasPaid ? "bg-yellow-500" : ""}
            >
              {hasPaid ? "Pending Confirmation" : "Unpaid"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
