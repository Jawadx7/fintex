# Scoring Service — Rules (pack format)

A rules pack is declarative data (never code), validated by `RulesPackSchema`
before it can be activated. Packs are immutable and versioned; the management API
only appends new versions and flips the active pointer.

## Pack shape

```json
{
  "schemaVersion": 1,
  "name": "default-pack",
  "tierActions": { "LOW": "ALLOW", "MEDIUM": "REVIEW", "HIGH": "HOLD_AND_ALERT" },
  "rules": [ /* ≤ 50 rules, ids unique */ ]
}
```

A rule:

```json
{
  "id": "full_balance_drain",
  "tag": "FULL_BALANCE_DRAIN",
  "label": "Full balance drain",
  "enabled": true,
  "severity": "HIGH",
  "reason": "Account emptied in a single outbound transfer …",
  "when": { "all": [ /* ≤ 12 conditions, nesting depth ≤ 3 */ ] }
}
```

| Field | Notes |
| --- | --- |
| `id` | `^[a-z][a-z0-9_]{0,39}$`, unique within the pack |
| `tag` | `^[A-Z][A-Z0-9_]{0,39}$` — the outcome label; **one hit per tag** |
| `label` | Human-readable name |
| `enabled` | Disabled rules are not evaluated and not reported |
| `severity` | `MEDIUM` \| `HIGH` (rules never produce `LOW`) |
| `reason` | Explanation surfaced in the response, ≤ 240 chars |
| `when` | A condition group |

A **condition group** is `{ "all": [...] }` or `{ "any": [...] }` (exactly one),
each with 1–12 conditions. Groups nest up to depth 3.

## Field condition

```json
{ "field": "amount", "op": "gte", "value": 1800 }
{ "field": "amount", "op": "gte", "valueRef": { "field": "sender.balanceBefore", "factor": 0.95 } }
```

| `op` | Value | Semantics |
| --- | --- | --- |
| `gte`, `gt`, `lte`, `lt` | number | Numeric comparison |
| `eq`, `neq` | string \| number \| boolean | Equality |
| `in` | array of ≤ 20 literals | Membership |
| `exists`, `not_exists` | — | Presence of the field |

`valueRef` substitutes a numeric field (optionally scaled by `factor`, default
`1`) for the literal. `valueRef.field` must be a **numeric** path (see
`WEIGHTS.md`).

## History condition

```json
{
  "history": { "scope": "sender_incoming", "window_minutes": 60, "metric": "sum_amount",
               "filter": { "types": ["TRANSFER"], "amount_gte": 100, "amount_lte": 99999 } },
  "op": "gte",
  "valueRef": { "field": "amount", "factor": 0.9 }
}
```

History conditions use **numeric operators only** (`gte`, `gt`, `lte`, `lt`) with
a `value` or `valueRef`. (To express "count equals 0" use `count < 1`.)

| `scope` | Prior transactions … |
| --- | --- |
| `sender_outgoing` | sent by this sender |
| `sender_incoming` | received by this sender |
| `receiver_incoming` | received by this receiver, from anyone |
| `pair` | from this sender **to** this receiver |

| `metric` | Value |
| --- | --- |
| `count` | Number of matching transactions |
| `sum_amount` | Sum of their amounts |
| `distinct_counterparties` | Distinct receivers (outgoing scopes) / senders (incoming scopes) |

`window_minutes` is 1–10080 (one week). `filter` is optional: `types`
(`TRANSFER`/`CASH_OUT`), `amount_gte`, `amount_lte`.

The window is **strictly before** the transaction's `occurredAt` (the transaction
being scored is never part of its own history). The start edge is inclusive. The
service loads at most **500 rows per scope**; hitting the cap sets
`historyTruncated: true`.

## Skip semantics

Every field path a rule references (including `valueRef` and history `valueRef`
paths, but **excluding** paths under `exists`/`not_exists`) is *required*. If any
required field is missing, the whole rule is **skipped and reported** — never
silently ignored, never an error:

```json
{ "id": "pass_through", "reason": "missing_field", "fields": ["sender.balanceBefore"] }
```

When history is unavailable for the tenant, history conditions count as missing
(`missing_field`). A value of the wrong type for the operator (e.g. a string
under `gte`) skips with `reason: "type_mismatch"`.

## Hits and tiers

A fired rule produces `{ id, tag, label, severity, reason, evidence }`. Evidence
is captured automatically: the resolved value of every field used, plus each
history metric under `history.<scope>.<metric>.<window>m`.

**One hit per tag:** if several rules share a tag, only the highest-severity hit
is kept (ties keep pack order).

`tierActions` maps the final tier to an action. The literal `"REVIEW"` is
accepted as an alias for `ALLOW_AND_REVIEW` and normalised before persistence.

The **final tier** is the higher of the rule tier (highest fired severity) and
the model tier. With no rules firing and no model: `LOW`.

## Worked examples

### 1. Full balance drain to a new recipient

```json
{
  "id": "full_balance_drain",
  "tag": "FULL_BALANCE_DRAIN",
  "label": "Full balance drain",
  "enabled": true,
  "severity": "HIGH",
  "reason": "Account emptied in a single outbound transfer to a recipient with no prior history.",
  "when": {
    "all": [
      { "field": "type", "op": "in", "value": ["TRANSFER", "CASH_OUT"] },
      { "field": "amount", "op": "gte", "value": 100 },
      { "field": "amount", "op": "gte", "valueRef": { "field": "sender.balanceBefore", "factor": 0.95 } },
      { "history": { "scope": "pair", "window_minutes": 10080, "metric": "count" }, "op": "lt", "value": 1 }
    ]
  }
}
```

A companion rule with the **same tag** and `MEDIUM` severity drops the `pair`
condition, giving a lower-severity variant for known recipients.

### 2. Structuring / threshold skirting

Fires when the amount sits just under a reporting threshold **and** there are ≥ 2
similar outbound transfers in the last day:

```json
{
  "id": "threshold_skirting",
  "tag": "THRESHOLD_SKIRTING",
  "label": "Threshold skirting",
  "enabled": true,
  "severity": "HIGH",
  "reason": "Multiple transfers deliberately kept just under a reporting threshold.",
  "when": {
    "all": [
      { "field": "amount", "op": "gte", "value": 1800 },
      { "field": "amount", "op": "lt", "value": 2000 },
      {
        "history": {
          "scope": "sender_outgoing",
          "window_minutes": 1440,
          "metric": "count",
          "filter": { "types": ["TRANSFER", "CASH_OUT"], "amount_gte": 1800, "amount_lte": 1999.99 }
        },
        "op": "gte",
        "value": 2
      }
    ]
  }
}
```

### 3. Data-agnostic rule on a tenant attribute (telco)

A telco tenant defines its own attribute and rule with no code change. When the
attribute is present the rule fires; when absent the rule is **skipped and
reported** (and, if a model uses it, the feature is imputed and reported):

```json
{
  "id": "recent_sim_swap_withdrawal",
  "tag": "RECENT_SIM_SWAP_WITHDRAWAL",
  "label": "Withdrawal soon after a SIM swap",
  "enabled": true,
  "severity": "HIGH",
  "reason": "A withdrawal shortly after the SIM was swapped is a strong account-takeover signal.",
  "when": {
    "all": [
      { "field": "attributes.sim_swap_days", "op": "lte", "value": 3 },
      { "field": "type", "op": "eq", "value": "CASH_OUT" }
    ]
  }
}
```

With `attributes.sim_swap_days` absent, the response contains
`skippedRules: [{ "id": "recent_sim_swap_withdrawal", "reason": "missing_field", "fields": ["attributes.sim_swap_days"] }]`.

## Shipped packs

`fixtures/rules/default-pack.json` (the baseline above),
`strict-pack.json`, `telco-pack.json` (the data-agnostic example), and
`conformance-6.1.json` (the brief's section 6.1 example).
