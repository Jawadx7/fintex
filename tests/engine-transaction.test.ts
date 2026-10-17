import { describe, expect, it } from "vitest";

import {
  CanonicalTransactionInputSchema,
  isNumericFieldPath,
  isValidFieldPath,
  resolveField,
  resolveValueRef,
  toCanonicalTransaction,
} from "@/lib/engine";

const VALID = {
  externalId: "txn_8841",
  type: "CASH_OUT",
  amount: "3195.00",
  currency: "GHS",
  occurredAt: "2026-10-10T13:18:00Z",
  sender: { walletId: "wlt_HTSWZM", balanceBefore: "3200.00" },
  receiver: { walletId: "wlt_1EAB7U", balanceBefore: "0.00" },
  attributes: { channel: "USSD", sim_swap_days: 2, new_device: true },
};

describe("CanonicalTransactionInputSchema", () => {
  it("accepts the section 4.1 example", () => {
    expect(CanonicalTransactionInputSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects unknown top-level keys (strict)", () => {
    const parsed = CanonicalTransactionInputSchema.safeParse({
      ...VALID,
      extra: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys inside sender/receiver (strict)", () => {
    expect(
      CanonicalTransactionInputSchema.safeParse({
        ...VALID,
        sender: { walletId: "w", nope: 1 },
      }).success
    ).toBe(false);
  });

  it("rejects non-positive amounts and bad decimals", () => {
    for (const amount of ["0", "0.00", "-5", "1.234", "1234567890123"]) {
      expect(
        CanonicalTransactionInputSchema.safeParse({ ...VALID, amount }).success
      ).toBe(false);
    }
  });

  it("requires a 3-letter uppercase currency", () => {
    expect(
      CanonicalTransactionInputSchema.safeParse({ ...VALID, currency: "ghs" })
        .success
    ).toBe(false);
  });

  it("requires occurredAt to carry a timezone", () => {
    expect(
      CanonicalTransactionInputSchema.safeParse({
        ...VALID,
        occurredAt: "2026-10-10T13:18:00",
      }).success
    ).toBe(false);
  });

  it("requires sender and receiver walletId, allows missing balances", () => {
    expect(
      CanonicalTransactionInputSchema.safeParse({
        ...VALID,
        sender: { walletId: "w" },
        receiver: { walletId: "r" },
      }).success
    ).toBe(true);
    expect(
      CanonicalTransactionInputSchema.safeParse({
        ...VALID,
        sender: {},
      }).success
    ).toBe(false);
  });

  it("caps attributes at 20 keys and enforces the key pattern", () => {
    const tooMany = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [`k${i}`, i])
    );
    expect(
      CanonicalTransactionInputSchema.safeParse({
        ...VALID,
        attributes: tooMany,
      }).success
    ).toBe(false);
    expect(
      CanonicalTransactionInputSchema.safeParse({
        ...VALID,
        attributes: { "1bad": 1 },
      }).success
    ).toBe(false);
    expect(
      CanonicalTransactionInputSchema.safeParse({
        ...VALID,
        attributes: { channel: "x".repeat(101) },
      }).success
    ).toBe(false);
  });
});

describe("toCanonicalTransaction", () => {
  it("maps the wire shape to the numeric canonical shape", () => {
    const input = CanonicalTransactionInputSchema.parse(VALID);
    const tx = toCanonicalTransaction(input);
    expect(tx.amount).toBe(3195);
    expect(tx.senderBalanceBefore).toBe(3200);
    expect(tx.receiverBalanceBefore).toBe(0);
    expect(tx.senderWalletId).toBe("wlt_HTSWZM");
    expect(tx.occurredAt.toISOString()).toBe("2026-10-10T13:18:00.000Z");
  });
});

describe("resolveField", () => {
  const tx = toCanonicalTransaction(CanonicalTransactionInputSchema.parse(VALID));

  it("resolves the documented paths", () => {
    expect(resolveField("amount", tx)).toBe(3195);
    expect(resolveField("type", tx)).toBe("CASH_OUT");
    expect(resolveField("currency", tx)).toBe("GHS");
    expect(resolveField("sender.balanceBefore", tx)).toBe(3200);
    expect(resolveField("receiver.balanceBefore", tx)).toBe(0);
    expect(resolveField("attributes.channel", tx)).toBe("USSD");
    expect(resolveField("attributes.sim_swap_days", tx)).toBe(2);
    expect(resolveField("attributes.new_device", tx)).toBe(true);
  });

  it("derives hourOfDay and dayOfWeek in UTC", () => {
    expect(resolveField("derived.hourOfDay", tx)).toBe(13);
    // 2026-10-10 is a Saturday; Monday = 0 -> Saturday = 5.
    expect(resolveField("derived.dayOfWeek", tx)).toBe(5);
  });

  it("returns null for missing or unknown paths", () => {
    expect(resolveField("attributes.absent", tx)).toBeNull();
    expect(resolveField("sender.walletId", tx)).toBeNull();
    expect(resolveField("nonsense", tx)).toBeNull();
  });

  it("classifies path validity", () => {
    expect(isValidFieldPath("amount")).toBe(true);
    expect(isValidFieldPath("attributes.sim_swap_days")).toBe(true);
    expect(isValidFieldPath("sender.walletId")).toBe(false);
    expect(isNumericFieldPath("sender.balanceBefore")).toBe(true);
    expect(isNumericFieldPath("type")).toBe(false);
  });
});

describe("resolveValueRef", () => {
  const tx = toCanonicalTransaction(CanonicalTransactionInputSchema.parse(VALID));
  it("scales a numeric field by factor", () => {
    expect(resolveValueRef(tx, { field: "amount", factor: 0.9 })).toBeCloseTo(
      2875.5
    );
    expect(resolveValueRef(tx, { field: "sender.balanceBefore" })).toBe(3200);
  });
  it("returns null for non-numeric or missing fields", () => {
    expect(resolveValueRef(tx, { field: "type" })).toBeNull();
    expect(resolveValueRef(tx, { field: "attributes.absent" })).toBeNull();
  });
});
