import "server-only";

import {
  ModelWeightsSchema,
  RulesPackSchema,
  type ModelWeights,
  type RulesPack,
} from "@/lib/engine";
import { prisma } from "@/lib/prisma";

/** Raised when a tenant cannot be scored (unknown, or no active rules pack). */
export class ScoringConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringConfigError";
  }
}

export interface ScoringConfig {
  tenantId: string;
  tenantSlug: string;
  rulesPack: RulesPack;
  rulesVersionId: string;
  rulesVersionNumber: number;
  model: ModelWeights | null;
  modelVersionId: string | null;
}

/**
 * The tenant shape needed to build a ScoringConfig. The API-key query selects
 * exactly these fields so the whole config travels with the key in one round
 * trip (Task D perf: one query for key + tenant + active model + active rules).
 */
export interface TenantScoringSource {
  id: string;
  slug: string;
  activeRulesVersion: {
    id: string;
    versionNumber: number;
    config: unknown;
  } | null;
  activeModelVersion: { id: string; weights: unknown } | null;
}

// Versions are immutable, so a parsed document cached by version id can never
// go stale. Activating a different version is picked up on the next request
// because the tenant's pointer (and thus the id) changes.
const rulesCache = new Map<string, RulesPack>();
const modelCache = new Map<string, ModelWeights>();

function parseRules(id: string, config: unknown): RulesPack {
  const cached = rulesCache.get(id);
  if (cached) return cached;
  const parsed = RulesPackSchema.parse(config);
  rulesCache.set(id, parsed);
  return parsed;
}

function parseModel(id: string, weights: unknown): ModelWeights {
  const cached = modelCache.get(id);
  if (cached) return cached;
  const parsed = ModelWeightsSchema.parse(weights);
  modelCache.set(id, parsed);
  return parsed;
}

/**
 * Build a ScoringConfig from an already-loaded tenant row. Parsing is cached by
 * immutable version id, so repeated calls for the same versions are free.
 */
export function scoringConfigFromTenant(
  tenant: TenantScoringSource
): ScoringConfig {
  const rulesVersion = tenant.activeRulesVersion;
  if (!rulesVersion) {
    throw new ScoringConfigError(
      `Tenant ${tenant.slug} has no active rules version`
    );
  }

  const rulesPack = parseRules(rulesVersion.id, rulesVersion.config);
  const activeModel = tenant.activeModelVersion;
  const model = activeModel
    ? parseModel(activeModel.id, activeModel.weights)
    : null;

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    rulesPack,
    rulesVersionId: rulesVersion.id,
    rulesVersionNumber: rulesVersion.versionNumber,
    model,
    modelVersionId: activeModel?.id ?? null,
  };
}

/**
 * Load a tenant's active rules pack and optional active model, validating both
 * against the engine schemas. A tenant with no active rules version cannot be
 * scored and raises ScoringConfigError.
 */
export async function loadScoringConfig(
  tenantId: string
): Promise<ScoringConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { activeRulesVersion: true, activeModelVersion: true },
  });

  if (!tenant) {
    throw new ScoringConfigError(`Unknown tenant: ${tenantId}`);
  }

  return scoringConfigFromTenant(tenant);
}
