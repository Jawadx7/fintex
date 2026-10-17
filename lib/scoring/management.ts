// Tenant-scoped scoring configuration management (Brief 4.1, Task G).
//
// Rules packs and models are immutable and versioned (D3/D6): the management
// API only ever appends a new version or flips a tenant's *active* pointer. It
// never mutates an existing version in place, so an assessment's recorded
// versions always resolve to the exact document that produced it.
//
// Callers pass an already-validated `RulesPack` / `ModelWeights` (validated by
// the route with the engine schemas); this layer owns persistence only.

import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ModelWeights, RulesPack } from "@/lib/engine";
import { prisma } from "@/lib/prisma";

import { generateApiKey } from "./api-key-format";

export interface RulesVersionSummary {
  id: string;
  versionNumber: number;
  note: string | null;
  createdAt: string;
  isActive: boolean;
  ruleCount: number;
}

export interface ModelVersionSummary {
  id: string;
  version: string;
  note: string | null;
  createdAt: string;
  isActive: boolean;
  featureCount: number;
  thresholds: { medium: number; high: number };
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ActiveConfig {
  tenantId: string;
  slug: string;
  name: string;
  activeRulesVersion: {
    id: string;
    versionNumber: number;
    note: string | null;
  } | null;
  activeModelVersion: {
    id: string;
    version: string;
    note: string | null;
  } | null;
}

type RulesVersionRow = Prisma.RulesVersionGetPayload<{
  select: {
    id: true;
    versionNumber: true;
    note: true;
    createdAt: true;
    config: true;
  };
}>;

type ModelVersionRow = Prisma.ModelVersionGetPayload<{
  select: {
    id: true;
    version: true;
    note: true;
    createdAt: true;
    weights: true;
  };
}>;

const RULES_VERSION_SELECT = {
  id: true,
  versionNumber: true,
  note: true,
  createdAt: true,
  config: true,
} as const;

const MODEL_VERSION_SELECT = {
  id: true,
  version: true,
  note: true,
  createdAt: true,
  weights: true,
} as const;

function ruleCount(config: Prisma.JsonValue): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const rules = (config as Record<string, unknown>).rules;
    if (Array.isArray(rules)) return rules.length;
  }
  return 0;
}

function weightsSummary(weights: Prisma.JsonValue): {
  featureCount: number;
  thresholds: { medium: number; high: number };
} {
  const fallback = { featureCount: 0, thresholds: { medium: 0.5, high: 0.8 } };
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return fallback;
  }
  const record = weights as Record<string, unknown>;
  const features = record.features;
  const thresholds = record.thresholds;
  const safeThresholds =
    thresholds && typeof thresholds === "object"
      ? {
          medium: Number((thresholds as Record<string, unknown>).medium) || 0,
          high: Number((thresholds as Record<string, unknown>).high) || 0,
        }
      : fallback.thresholds;
  return {
    featureCount: Array.isArray(features) ? features.length : 0,
    thresholds: safeThresholds,
  };
}

function toRulesSummary(
  row: RulesVersionRow,
  activeRulesVersionId: string | null
): RulesVersionSummary {
  return {
    id: row.id,
    versionNumber: row.versionNumber,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    isActive: row.id === activeRulesVersionId,
    ruleCount: ruleCount(row.config),
  };
}

function toModelSummary(
  row: ModelVersionRow,
  activeModelVersionId: string | null
): ModelVersionSummary {
  const { featureCount, thresholds } = weightsSummary(row.weights);
  return {
    id: row.id,
    version: row.version,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    isActive: row.id === activeModelVersionId,
    featureCount,
    thresholds,
  };
}

function toApiKeySummary(row: {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}): ApiKeySummary {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

/** Active rules + model for a tenant, or null if the tenant is unknown. */
export async function getActiveConfig(
  tenantId: string
): Promise<ActiveConfig | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      activeRulesVersion: {
        select: { id: true, versionNumber: true, note: true },
      },
      activeModelVersion: { select: { id: true, version: true, note: true } },
    },
  });

  if (!tenant) return null;

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    activeRulesVersion: tenant.activeRulesVersion
      ? {
          id: tenant.activeRulesVersion.id,
          versionNumber: tenant.activeRulesVersion.versionNumber,
          note: tenant.activeRulesVersion.note,
        }
      : null,
    activeModelVersion: tenant.activeModelVersion
      ? {
          id: tenant.activeModelVersion.id,
          version: tenant.activeModelVersion.version,
          note: tenant.activeModelVersion.note,
        }
      : null,
  };
}

/** Append a new immutable rules-pack version. Does not activate it. */
export async function createRulesVersion(
  tenantId: string,
  pack: RulesPack,
  options: { createdById?: string | null; note?: string | null } = {}
): Promise<RulesVersionSummary | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) return null;

  const last = await prisma.rulesVersion.findFirst({
    where: { tenantId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;

  const created = await prisma.rulesVersion.create({
    data: {
      tenantId,
      versionNumber,
      config: pack as unknown as Prisma.InputJsonValue,
      note: options.note ?? null,
      createdById: options.createdById ?? null,
    },
    select: RULES_VERSION_SELECT,
  });

  return toRulesSummary(created, null);
}

/** List a tenant's rules versions with the active one flagged. */
export async function listRulesVersions(
  tenantId: string
): Promise<RulesVersionSummary[] | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { activeRulesVersionId: true },
  });
  if (!tenant) return null;

  const rows = await prisma.rulesVersion.findMany({
    where: { tenantId },
    orderBy: { versionNumber: "desc" },
    select: RULES_VERSION_SELECT,
  });

  return rows.map((row) => toRulesSummary(row, tenant.activeRulesVersionId));
}

/** Point the tenant at an existing rules version. Null if not found. */
export async function activateRulesVersion(
  tenantId: string,
  id: string
): Promise<RulesVersionSummary | null> {
  const version = await prisma.rulesVersion.findFirst({
    where: { id, tenantId },
    select: RULES_VERSION_SELECT,
  });
  if (!version) return null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { activeRulesVersionId: id },
  });

  return toRulesSummary(version, id);
}

/** Append a new immutable model version. Does not activate it. */
export async function createModelVersion(
  tenantId: string,
  weights: ModelWeights,
  options: { createdById?: string | null; note?: string | null } = {}
): Promise<ModelVersionSummary | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) return null;

  const created = await prisma.modelVersion.create({
    data: {
      tenantId,
      version: weights.modelVersion,
      weights: weights as unknown as Prisma.InputJsonValue,
      note: options.note ?? null,
      createdById: options.createdById ?? null,
    },
    select: MODEL_VERSION_SELECT,
  });

  return toModelSummary(created, null);
}

/** List a tenant's model versions with the active one flagged. */
export async function listModelVersions(
  tenantId: string
): Promise<ModelVersionSummary[] | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { activeModelVersionId: true },
  });
  if (!tenant) return null;

  const rows = await prisma.modelVersion.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: MODEL_VERSION_SELECT,
  });

  return rows.map((row) => toModelSummary(row, tenant.activeModelVersionId));
}

/** Point the tenant at an existing model version. Null if not found. */
export async function activateModelVersion(
  tenantId: string,
  id: string
): Promise<ModelVersionSummary | null> {
  const version = await prisma.modelVersion.findFirst({
    where: { id, tenantId },
    select: MODEL_VERSION_SELECT,
  });
  if (!version) return null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { activeModelVersionId: id },
  });

  return toModelSummary(version, id);
}

/** List a tenant's API keys (never the hash or the secret). */
export async function listApiKeys(
  tenantId: string
): Promise<ApiKeySummary[]> {
  const rows = await prisma.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toApiKeySummary);
}

export interface CreatedApiKey {
  /** The full secret, returned exactly once and never stored. */
  key: string;
  apiKey: ApiKeySummary;
}

/** Mint a new API key. The secret is returned once and only its hash stored. */
export async function createApiKey(
  tenantId: string,
  name: string
): Promise<CreatedApiKey | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) return null;

  const generated = generateApiKey();
  const row = await prisma.apiKey.create({
    data: {
      tenantId,
      name,
      prefix: generated.prefix,
      hash: generated.hash,
    },
  });

  return { key: generated.key, apiKey: toApiKeySummary(row) };
}

/** Revoke an API key. Idempotent; null if the key is not in this tenant. */
export async function revokeApiKey(
  tenantId: string,
  id: string
): Promise<ApiKeySummary | null> {
  const existing = await prisma.apiKey.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return null;

  if (existing.revokedAt) return toApiKeySummary(existing);

  const row = await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return toApiKeySummary(row);
}
