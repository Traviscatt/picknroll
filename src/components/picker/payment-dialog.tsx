"use client";

import { CheckCircle, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { paymentDetails, type PoolPayment } from "@/lib/payment";

/** Shown after a bracket is submitted: entry fee and the pool's PayPal/Venmo links */
export function PaymentDialog({ open, pool, entryName, onDone }: { open: boolean; pool: PoolPayment | null; entryName: string; onDone: () => void }) {
  const payment = paymentDetails(pool);
  const option = (label: string, detail: string, url: string, badge: string, color: string) => (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <span className="text-sm font-bold text-white">{badge}</span>
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")}>
        <ExternalLink className="mr-1 h-4 w-4" />
        Pay
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Bracket Submitted!
          </DialogTitle>
          <DialogDescription>Your bracket has been submitted successfully. Please complete payment to finalize your entry.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-accent bg-secondary p-4">
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Entry Fee: {payment.feeLabel}</span>
            </div>
            <p className="text-sm text-secondary-foreground">Payment is required to be eligible for prizes.</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Payment Options:</h4>
            {payment.venmoUrl && option("Venmo", `@${payment.venmoHandle}`, payment.venmoUrl, "V", "bg-blue-500")}
            {payment.paypalUrl && option("PayPal", payment.paypalLabel ?? "", payment.paypalUrl, "P", "bg-blue-700")}
            {!payment.venmoUrl && !payment.paypalUrl && <p className="text-sm text-muted-foreground">Ask the pool admin how to pay.</p>}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Include your name &quot;{entryName}&quot; in the payment note.
            <br />
            Your entry will be marked as paid once confirmed by the admin.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onDone}>
            I&apos;ll Pay Later
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
