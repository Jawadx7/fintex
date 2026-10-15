// Compliance typologies: the explainable, named patterns the scoring engine
// tags a transaction with. Kept dependency-free (no Prisma import) so both
// server code and client components can use it, and so the seed, the dashboard
// and the future engine all describe patterns identically.

export type TypologyTag =
  | "FULL_BALANCE_DRAIN"
  | "THRESHOLD_SKIRTING"
  | "RAPID_SEQUENCE"
  | "PASS_THROUGH";

export interface Typology {
  tag: TypologyTag;
  /** Human label for badges and headings. */
  label: string;
  /**
   * Tier the pattern implies on its own. The engine may escalate
   * (e.g. FULL_BALANCE_DRAIN -> HIGH when the recipient is a brand-new wallet).
   */
  baseTier: "MEDIUM" | "HIGH";
  /** One-line summary for tables/tooltips. */
  summary: string;
  /** Longer explanation shown on the alert detail page. */
  description: string;
}

export const TYPOLOGIES: Record<TypologyTag, Typology> = {
  FULL_BALANCE_DRAIN: {
    tag: "FULL_BALANCE_DRAIN",
    label: "Full balance drain",
    baseTier: "MEDIUM",
    summary: "Account emptied in a single outbound transfer.",
    description:
      "The sender moves essentially their entire balance in one transaction. " +
      "Common in account-takeover fraud, where the victim's wallet is drained " +
      "to a recipient they have never paid before. Escalates to HIGH when the " +
      "recipient wallet has no prior history with the sender.",
  },
  THRESHOLD_SKIRTING: {
    tag: "THRESHOLD_SKIRTING",
    label: "Threshold skirting",
    baseTier: "HIGH",
    summary: "Several transfers sized just below a reporting threshold.",
    description:
      "Multiple transfers are deliberately kept just under a reporting or " +
      "review threshold to avoid scrutiny (structuring). Detected by comparing " +
      "amounts and timing across a sender's recent transactions.",
  },
  RAPID_SEQUENCE: {
    tag: "RAPID_SEQUENCE",
    label: "Rapid sequence",
    baseTier: "MEDIUM",
    summary: "Several transactions from one wallet in a short window.",
    description:
      "A burst of outbound transactions from the same wallet within minutes. " +
      "On its own it is suggestive; combined with threshold skirting it " +
      "strongly indicates deliberate structuring.",
  },
  PASS_THROUGH: {
    tag: "PASS_THROUGH",
    label: "Pass-through",
    baseTier: "HIGH",
    summary: "Funds received and immediately cashed out.",
    description:
      "An inbound transfer is followed within minutes by an outbound cash-out " +
      "of a near-identical amount, leaving little or no value behind. A classic " +
      "money-mule / layering pattern.",
  },
};

export const TYPOLOGY_TAGS = Object.keys(TYPOLOGIES) as TypologyTag[];

export function isTypologyTag(value: string): value is TypologyTag {
  return value in TYPOLOGIES;
}

export function typology(tag: TypologyTag): Typology {
  return TYPOLOGIES[tag];
}
