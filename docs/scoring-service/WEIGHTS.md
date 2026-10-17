# Scoring Service — Weights (model contract)

A model is a **versioned logistic regression**. This document is the contract the
training notebook is written against, so the semantics here are exact.

A model is optional. When a tenant has no active model the service scores in
`RULES_ONLY` mode.

## Document shape (`ModelWeightsSchema`)

```json
{
  "schemaVersion": 1,
  "modelType": "logistic_regression",
  "modelVersion": "sample-a-2026-10-20",
  "intercept": -4.2,
  "features": [
    {
      "name": "amount_log",
      "source": "amount",
      "transform": { "type": "log1p" },
      "coefficient": 0.8,
      "mean": 6.1,
      "std": 1.9,
      "missing": 6.1
    }
  ],
  "thresholds": { "medium": 0.3, "high": 0.7 },
  "metadata": { "trainedOn": "PaySim (synthetic)", "metrics": { "prAuc": 0.12 } }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `schemaVersion` | `1` | Literal |
| `modelType` | `"logistic_regression"` | Literal — the only supported model |
| `modelVersion` | string | `[A-Za-z0-9._-]{1,64}`; recorded on every assessment |
| `intercept` | number | The bias term |
| `features` | array | **1–50** features, names unique |
| `thresholds.medium` / `.high` | number | Must satisfy `0 < medium < high < 1` |
| `metadata` | object | Free-form, ignored by the engine |

Each feature:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | `^[a-z][a-z0-9_]{0,39}$`, unique |
| `source` | field path | See below |
| `transform` | object | See below |
| `coefficient` | number | Logistic weight |
| `mean` | number | Training mean of the **transformed** value |
| `std` | number | Training std of the **transformed** value, `> 0` |
| `missing` | number | Optional; used **as the post-transform value `x`** when the source is missing |

## Field paths (`source` / `valueRef.field`)

| Path | Type | Notes |
| --- | --- | --- |
| `amount` | number | The transaction amount |
| `type` | `"TRANSFER"` \| `"CASH_OUT"` | |
| `currency` | string | |
| `sender.balanceBefore` | number \| null | |
| `receiver.balanceBefore` | number \| null | |
| `derived.hourOfDay` | number | **UTC** hour, `0–23` |
| `derived.dayOfWeek` | number | **UTC** day, **Monday = 0 … Sunday = 6** |
| `attributes.<key>` | string \| number \| boolean | Tenant-defined; `<key>` matches `^[A-Za-z][A-Za-z0-9_]{0,39}$` |

All derivations are computed in **UTC** — a model trained on local time will not
match.

## Transform vocabulary (closed set)

| `type` | Extra fields | `x = f(value)` |
| --- | --- | --- |
| `identity` | — | `value` |
| `log1p` | — | `ln(1 + value)`, value clamped to `≥ 0` |
| `onehot` | `value` (string/number/boolean) | `1` if source `=== value` else `0` |
| `cyclic_sin` | `period` (`> 0`) | `sin(2π · value / period)` |
| `cyclic_cos` | `period` (`> 0`) | `cos(2π · value / period)` |
| `clip` | `min`, `max` (`min ≤ max`) | `min(max(value, min), max)` |
| `gte` | `value` (number) | `1` if `value ≥ threshold` else `0` |

`onehot` compares with strict equality (`===`) against the source value; the
`value` may be a string, number, or boolean.

## Scoring

For each feature, with the resolved source value:

1. **Transform** → `x`.
2. **Standardise** → `z = (x − mean) / std`.
3. **Contribute** → `coefficient · z`.

Then:

```
logit = intercept + Σ (coefficient · z)
score = sigmoid(logit) = 1 / (1 + e^(−logit))
```

`mean` and `std` **must be computed on the transformed value, over the training
set** (i.e. after applying `transform`, before standardising). This is the single
most common integration mistake.

The tier comes from the score and the thresholds: `HIGH` if `score ≥ high`,
`MEDIUM` if `score ≥ medium`, else `LOW`.

## Missing / unusable values

A value is **unusable** when the source is absent, or is non-numeric where a
numeric transform needs a number. When unusable:

- If the feature has `missing`, use it **as the post-transform value `x`**
  (it is **not** passed through `transform` again).
- Otherwise impute `x = mean`, so `z = 0` and the contribution is `0`.

Either way the feature name is listed in `imputedFeatures` in the response.

`onehot` on a missing source also counts as missing; the feature's numeric
`missing` (if any) is then used directly as `x`, otherwise `x = mean`.

## Worked example

The default shipped model is `fixtures/weights/sample-a.json`, which is the
brief's section 5 example. The `sample-b` and `telco-sample` fixtures show a
second model and a data-agnostic model keyed on `attributes.sim_swap_days`.
