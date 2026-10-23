import { describe, expect, it } from "vitest";
import { paymentDetails } from "@/lib/payment";

describe("paymentDetails", () => {
  it("builds links from the pool's values", () => {
    const p = paymentDetails({ entryFee: "5", paypalLink: "paypal.me/Traviscatt", venmoHandle: "@Traviscatt" });
    expect(p.feeLabel).toBe("$5.00");
    expect(p.paypalUrl).toBe("https://paypal.me/Traviscatt/5.00");
    expect(p.paypalLabel).toBe("paypal.me/Traviscatt");
    expect(p.venmoHandle).toBe("Traviscatt");
    expect(p.venmoUrl).toBe("https://www.venmo.com/u/Traviscatt?txn=pay&amount=5.00&note=PickNRoll%20Entry%20Fee");
  });

  it("omits payment options that aren't set up", () => {
    const p = paymentDetails({ entryFee: 10, paypalLink: "", venmoHandle: null });
    expect(p.feeLabel).toBe("$10.00");
    expect(p.paypalUrl).toBeNull();
    expect(p.venmoUrl).toBeNull();
    expect(paymentDetails(null).feeLabel).toBe("$0.00");
  });
});
