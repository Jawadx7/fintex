# Scoring Service — API

The scoring service exposes one public, data-plane endpoint (`/api/v1`, bearer
API key) and a set of session-authenticated management endpoints (`/api/admin`).

- Money always crosses the wire as **decimal strings** (`"3195.00"`), never
  numbers.
- Timestamps are **ISO-8601 with an explicit timezone** (`Z` or `±hh:mm`).
- All responses use the error envelope `{ "error": { "code", "message",
  "details": [] } }`.

## `POST /api/v1/score`

Scores a single transaction for the tenant that owns the API key.

### Request

| Header | Required | Notes |
| --- | --- | --- |
| `Authorization` | yes | `Bearer fxk_<prefix>_<secret>` |
| `Idempotency-Key` | yes | 1–200 characters, unique per tenant |
| `Content-Type` | yes | `application/json` |

Body (strict — unknown fields are rejected):

```json
{
  "transaction": {
    "externalId": "txn_8841",
    "type": "CASH_OUT",
    "amount": "3195.00",
    "currency": "GHS",
    "occurredAt": "2026-10-10T13:18:00Z",
    "sender":   { "walletId": "wlt_HTSWZM", "balanceBefore": "3200.00" },
    "receiver": { "walletId": "wlt_1EAB7U", "balanceBefore": "0.00" },
    "attributes": { "channel": "USSD", "sim_swap_days": 2, "new_device": true }
  }
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `externalId` | string | no | Caller's own id, echoed back for reconciliation |
| `type` | `TRANSFER` \| `CASH_OUT` | yes | |
| `amount` | decimal string | yes | Positive, ≤ 2 decimals |
| `currency` | 3 uppercase letters | no | Defaults to `GHS` |
| `occurredAt` | ISO datetime + tz | yes | Loaded history is strictly *before* this |
| `sender.walletId` | string | yes | |
| `sender.balanceBefore` | decimal string \| null | no | Non-negative |
| `receiver.walletId` | string | yes | |
| `receiver.balanceBefore` | decimal string \| null | no | Non-negative |
| `attributes` | object | no | ≤ 20 keys, keys `^[A-Za-z][A-Za-z0-9_]{0,39}$`, values string/number/boolean |

The `attributes` bag is the data-agnostic extension point: a rule or feature can
reference `attributes.<key>` without any code change.

### Response `200`

```json
{
  "requestId": "req_5f0c…",
  "transactionId": "cmvb…",
  "mode": "MODEL_AND_RULES",
  "riskScore": 0.83,
  "tier": "HIGH",
  "action": "HOLD_AND_ALERT",
  "tags": ["FULL_BALANCE_DRAIN", "NEW_RECIPIENT"],
  "reasons": [
    {
      "ruleId": "full_balance_drain",
      "tag": "FULL_BALANCE_DRAIN",
      "severity": "HIGH",
      "message": "Account emptied in a single outbound transfer …",
      "evidence": { "amount": 3195, "history.pair.count.10080m": 0 }
    }
  ],
  "contributions": [
    { "feature": "amount_log", "value": 8.07, "z": 1.03, "contribution": 0.83 }
  ],
  "imputedFeatures": ["recent_sim_swap"],
  "skippedRules": [
    { "id": "pass_through", "reason": "missing_field", "fields": ["sender.balanceBefore"] }
  ],
  "modelVersion": "sample-a-2026-10-20",
  "rulesVersion": 1,
  "historyAvailable": true,
  "historyTruncated": false,
  "latencyMs": 42
}
```

- `mode` is `RULES_ONLY` when the tenant has no active model, else
  `MODEL_AND_RULES`. In `RULES_ONLY`: `riskScore: null`, `contributions: []`,
  `modelVersion: null`.
- `contributions` is the **top 5 features by absolute contribution**.
- `historyTruncated` is `true` when any scope hit the 500-row cap.
- `transactionId` is `null` only for the internal `persist: false` path.

### Idempotency

Keyed on `(tenantId, Idempotency-Key)`:

- **First request** — scored and persisted.
- **Replay (same payload)** — the stored result is returned unchanged with the
  header `Idempotent-Replayed: true`; the transaction is never re-scored.
- **Same key, different payload** — `409 idempotency_key_reuse`.
- **Concurrent requests** — serialised by a DB unique constraint; exactly one
  wins and the loser re-reads and replays.

### Status codes

| Status | Code | Meaning |
| --- | --- | --- |
| `200` | — | Scored (fresh or replay) |
| `400` | `missing_idempotency_key` | Header missing or > 200 chars |
| `400` | `validation_error` | Body failed validation (`details` = Zod issues) |
| `400` | `invalid_json` | Body not valid JSON |
| `401` | `invalid_api_key` | Missing / malformed / unknown / revoked key |
| `409` | `idempotency_key_reuse` | Key reused with a different payload |
| `413` | `payload_too_large` | Body > 16 KB |
| `503` | `rules_not_configured` | Tenant has no active rules version |
| `500` | `internal_error` | Unexpected; no internals are leaked |

## Management API (session auth)

All administrative routes require an authenticated session whose user is an
`ADMIN` bound to a tenant. **The tenant id always comes from the session, never
the request body.**

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/scoring/config` | Active rules + model for the tenant |
| `GET` | `/api/admin/scoring/rules-versions` | List packs (active flagged) |
| `POST` | `/api/admin/scoring/rules-versions` | Append a new pack (validated) |
| `POST` | `/api/admin/scoring/rules-versions/{id}/activate` | Switch active pack |
| `GET` | `/api/admin/scoring/model-versions` | List models (active flagged) |
| `POST` | `/api/admin/scoring/model-versions` | Append a new model (validated) |
| `POST` | `/api/admin/scoring/model-versions/{id}/activate` | Switch active model |
| `GET` | `/api/admin/api-keys` | List keys (never the hash or secret) |
| `POST` | `/api/admin/api-keys` | Mint a key (secret returned once) |
| `DELETE` | `/api/admin/api-keys/{id}` | Revoke a key (soft delete) |
| `GET` | `/api/admin/alerts` | Tenant-scoped assessments (list) |
| `GET` | `/api/admin/alerts/summary` | Tenant-scoped counts |
| `GET` / `PATCH` | `/api/admin/alerts/{id}` | Detail / review update (404 if other tenant) |
| `GET` | `/api/admin/me` | Current session's user + tenant |

Pack and model uploads are capped at 100 KB. Versions are **immutable**: the API
only appends new versions and flips the active pointer. Every assessment records
the exact `rulesVersionId` (and `modelVersionId` when a model ran) that produced
it.

API keys are stored only as a SHA-256 hash; the non-secret lookup id
`fxk_<prefix>` is stored in the clear (unique index) and compared in constant
time.

## Provisioning

Tenants and keys are created by the seed or the scripts:

```
npm run tenant:create -- --slug fintex-demo --name "Fintex Demo" --admin-email admin@fintex.app
npm run key:create    -- --tenant fintex-demo --name local
```

`npm run db:seed` re-scopes the synthetic demo dataset to the `fintex-demo`
tenant and idempotently provisions a local demo API key (from
`SEED_DEMO_API_KEY`, or generated once and printed). Legacy keys whose prefix
predates the `fxk_` format are automatically revoked.
