// Entry fee and payment links come from the pool (Pool.entryFee, paypalLink, venmoHandle).

export interface PoolPayment {
  entryFee: string | number | null;
  paypalLink: string | null;
  venmoHandle: string | null;
}

const amount = (fee: PoolPayment["entryFee"] | undefined) => Number(fee ?? 0).toFixed(2);

export function paymentDetails(pool: PoolPayment | null | undefined) {
  const fee = amount(pool?.entryFee);
  const venmo = pool?.venmoHandle?.trim().replace(/^@/, "") || null;
  const rawPaypal = pool?.paypalLink?.trim().replace(/\/+$/, "") || null;
  const paypal = rawPaypal && !/^https?:\/\//i.test(rawPaypal) ? `https://${rawPaypal}` : rawPaypal;
  return {
    /** "5.00" */
    amount: fee,
    /** "$5.00" */
    feeLabel: `$${fee}`,
    venmoHandle: venmo,
    venmoUrl: venmo ? `https://www.venmo.com/u/${encodeURIComponent(venmo)}?txn=pay&amount=${fee}&note=PickNRoll%20Entry%20Fee` : null,
    paypalLink: paypal,
    paypalLabel: paypal?.replace(/^https?:\/\//, "") ?? null,
    paypalUrl: paypal ? `${paypal}/${fee}` : null,
  };
}
