// Task B: the data-agnostic, canonical transaction shape the scoring engine
// works on. This module is deliberately free of Prisma, Next and app imports so
// the engine can be unit-tested in isolation and reused by any caller.
//
// Money is a JS number *inside* the engine (feature maths needs arithmetic), but
// it always arrives as a decimal string over the wire and is persisted as a
// Decimal, so the string -> number conversion happens exactly once, here.

import { z } from "zod";

export type EngineTransactionType = "TRANSFER" | "CASH_OUT";

export const TransactionTypeSchema = z.enum(["TRANSFER", "CASH_OUT"]);

export const ATTRIBUTE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
export const MAX_ATTRIBUTES = 20;

/**
 * Positive decimal money string, up to 14 digits total with at most 2 decimals.
 * `0` and `0.00` are rejected: amounts are positive.
 */
export const MoneyStringSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "amount must have at most 2 decimal places")
  .refine((v) => Number(v) > 0, "amount must be positive");

/** Non-negative decimal money string, used for `balanceBefore`. */
export const BalanceStringSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "balance must have at most 2 decimal places");

const CurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "currency must be 3 uppercase letters");

/** ISO datetime that must carry an explicit timezone (Z or ±hh:mm). */
const IsoDateTimeWithZoneSchema = z
  .string()
  .refine(
    (v) =>
      /([zZ]|[+-]\d{2}:\d{2})$/.test(v) &&
      !Number.isNaN(Date.parse(v)),
    "occurredAt must be an ISO datetime with a timezone"
  )
  .transform((v) => new Date(v));

const AttributeValueSchema = z.union([
  z.string().max(100),
  z.number().finite(),
  z.boolean(),
]);

const AttributesSchema = z
  .record(z.string().regex(ATTRIBUTE_KEY_PATTERN), AttributeValueSchema)
  .refine(
    (obj) => Object.keys(obj).length <= MAX_ATTRIBUTES,
    `attributes may have at most ${MAX_ATTRIBUTES} keys`
  )
  .default({});

const WalletSchema = z
  .object({
    walletId: z.string().min(1).max(255),
    balanceBefore: BalanceStringSchema.nullable().optional(),
  })
  .strict();

/**
 * Wire contract for a single transaction submitted to the scoring service
 * (section 4.1). Strict: unknown keys are rejected.
 */
export const CanonicalTransactionInputSchema = z
  .object({
    externalId: z.string().min(1).max(255).optional(),
    type: TransactionTypeSchema,
    amount: MoneyStringSchema,
    currency: CurrencySchema.default("GHS"),
    occurredAt: IsoDateTimeWithZoneSchema,
    sender: WalletSchema,
    receiver: WalletSchema,
    attributes: AttributesSchema,
  })
  .strict();

export type CanonicalTransactionInput = z.infer<
  typeof CanonicalTransactionInputSchema
>;

/**
 * A transaction as the engine consumes it: numeric money, a real Date, and a
 * free-form tenant-defined `attributes` bag whose keys rules and features can
 * reference by name. Field names mirror section 4.2 / section 7.
 */
export interface CanonicalTransaction {
  externalId?: string;
  type: EngineTransactionType;
  amount: number;
  currency: string;
  senderWalletId: string;
  receiverWalletId: string;
  senderBalanceBefore: number | null;
  receiverBalanceBefore: number | null;
  occurredAt: Date;
  attributes: Record<string, string | number | boolean>;
}

function toMoney(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/** Parse a validated wire input into the engine's numeric canonical shape. */
export function toCanonicalTransaction(
  input: CanonicalTransactionInput
): CanonicalTransaction {
  return {
    externalId: input.externalId,
    type: input.type,
    amount: Number(input.amount),
    currency: input.currency,
    senderWalletId: input.sender.walletId,
    receiverWalletId: input.receiver.walletId,
    senderBalanceBefore: toMoney(input.sender.balanceBefore),
    receiverBalanceBefore: toMoney(input.receiver.balanceBefore),
    occurredAt: input.occurredAt,
    attributes: input.attributes,
  };
}

export type FieldValue = number | string | boolean | null;

/** A reference to a (numeric) field path, optionally scaled by a factor. */
export const ValueRefSchema = z
  .object({
    field: z.string().min(1),
    factor: z.number().finite().optional(),
  })
  .strict();

export type ValueRef = z.infer<typeof ValueRefSchema>;

const ATTRIBUTE_PATH = /^attributes\.[A-Za-z][A-Za-z0-9_]{0,39}$/;

/** The closed set of valid field paths (section 4.2). */
export const FIELD_PATHS = [
  "amount",
  "type",
  "currency",
  "sender.balanceBefore",
  "receiver.balanceBefore",
  "derived.hourOfDay",
  "derived.dayOfWeek",
] as const;

/** Numeric field paths usable in a `valueRef` / numeric operator. */
export const NUMERIC_FIELD_PATHS = [
  "amount",
  "sender.balanceBefore",
  "receiver.balanceBefore",
  "derived.hourOfDay",
  "derived.dayOfWeek",
] as const;

export function isValidFieldPath(path: string): boolean {
  return (
    (FIELD_PATHS as readonly string[]).includes(path) ||
    ATTRIBUTE_PATH.test(path)
  );
}

export function isNumericFieldPath(path: string): boolean {
  return (NUMERIC_FIELD_PATHS as readonly string[]).includes(path);
}

/**
 * Resolve a field path on a transaction (section 4.2 / section 7 signature).
 * Returns the value, or null when missing. `derived.hourOfDay` and
 * `derived.dayOfWeek` are computed in **UTC** (Monday = 0).
 */
export function resolveField(
  path: string,
  tx: CanonicalTransaction
): FieldValue {
  switch (path) {
    case "amount":
      return tx.amount;
    case "type":
      return tx.type;
    case "currency":
      return tx.currency;
    case "sender.balanceBefore":
      return tx.senderBalanceBefore;
    case "receiver.balanceBefore":
      return tx.receiverBalanceBefore;
    case "derived.hourOfDay":
      return tx.occurredAt.getUTCHours();
    case "derived.dayOfWeek":
      return (tx.occurredAt.getUTCDay() + 6) % 7;
    default: {
      if (path.startsWith("attributes.")) {
        const key = path.slice("attributes.".length);
        const value = tx.attributes[key];
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return value;
        }
      }
      return null;
    }
  }
}

/**
 * Resolve a numeric `valueRef` to a concrete number, or null when the field is
 * missing or non-numeric. `factor` defaults to 1.
 */
export function resolveValueRef(
  tx: CanonicalTransaction,
  ref: ValueRef
): number | null {
  const base = resolveField(ref.field, tx);
  if (typeof base !== "number" || !Number.isFinite(base)) return null;
  return base * (ref.factor ?? 1);
}
