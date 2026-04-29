"use server";

import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { DEFAULT_FUNCTION_SDK, type FunctionPackageRecord } from "@/lib/function-packages";
import { getLatestNpmVersion } from "@/lib/npm-registry";
import { extractExternalPackageNames } from "@/lib/package-imports";
import { requireOrgPermission } from "@/lib/session";
import { fetchExternalDocsContext } from "@/server/ai-docs";
import {
  type GeneratorAttachment,
  buildGeneratorMessages,
  buildPayloadInferenceMessages,
  buildRepairMessages,
  enforceMainAndSdkImport,
  extractJsonObject,
  extractTsCode,
  validateGeneratedCode,
} from "@/server/ai-generator";
import { ensureWorkspaceSdkApiKey } from "@/server/api-tokens";
import { executor } from "@/server/executor";
import {
  getFunctionAssetBlob,
  listFunctionAssets,
  snapshotAssetsToVersion,
} from "@/server/fn-assets";
import {
  FnAiContextError,
  type FnAiContextRecord,
  createContext as createFnAiContextRecord,
  deleteContext as deleteFnAiContextRecord,
  fetchUrlAsContext,
  getEnabledContextsByIds,
  refreshUrlContext as refreshFnAiContextUrl,
  toggleContextEnabled as toggleFnAiContextEnabled,
  updateContext as updateFnAiContextRecord,
} from "@/server/fn-ai-context";
import {
  MARKETPLACE_CATEGORIES,
  deleteSecretForFunction,
  getDraft,
  getFunctionPackagesForOrg,
  listSecretsForFunction,
  setFunctionPackagesForOrg,
  setSecretForFunction,
  updateFunctionVisibility,
  upsertFunctionMarketplaceProfile,
} from "@/server/functions";
import {
  getFunctionGithubBinding,
  listGithubBranchesForRepo,
  listSelectedGithubReposForOrg,
  removeFunctionGithubBinding,
  saveFunctionGithubBinding,
} from "@/server/github-integrations";
import {
  type AiProvider,
  IntegrationConfigError,
  resolveAiConfigForGeneration,
} from "@/server/integrations";
import { inferPayloadStatic, parsePayloadCandidate } from "@/server/payload-inference";
import { getOrgPlan } from "@/server/plan";
import { db, genId, schema, sql } from "@hostfunc/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function compatWhere<T>(value: T): T {
  return value;
}

const saveDraftSchema = z.object({
  fnId: z.string(),
  code: z.string().max(1_000_000),
});
const generateCodeSchema = z.object({
  fnId: z.string(),
  prompt: z.string().min(8).max(4_000),
  provider: z.enum(["openai", "claude"]),
  model: z.string().trim().min(1).max(120),
  useLiveLookup: z.boolean().default(false),
  lookupHints: z.array(z.string().trim().min(1).max(100)).max(8).default([]),
  contextIds: z.array(z.string().min(1).max(80)).max(20).default([]),
});
const runFunctionSchema = z.object({
  fnId: z.string(),
  payloadJson: z.string().max(1_000_000).optional(),
});
const inferRunPayloadSchema = z.object({
  fnId: z.string(),
  code: z.string().max(1_000_000),
});
const setSecretSchema = z.object({
  fnId: z.string(),
  key: z.string().min(1).max(128),
  value: z.string().min(1).max(8_192),
});
const deleteSecretSchema = z.object({
  fnId: z.string(),
  key: z.string().min(1).max(128),
});
const addPackageSchema = z.object({
  fnId: z.string(),
  name: z.string().min(1).max(214),
});
const removePackageSchema = z.object({
  fnId: z.string(),
  name: z.string().min(1).max(214),
});
const refreshPackageSchema = z.object({
  fnId: z.string(),
  name: z.string().min(1).max(214),
});
const updateDescriptionSchema = z.object({
  fnId: z.string(),
  description: z.string().max(280),
});
const updateVisibilitySchema = z.object({
  fnId: z.string(),
  visibility: z.enum(["public", "private"]),
});
const updateMarketplaceProfileSchema = z.object({
  fnId: z.string(),
  category: z.enum(MARKETPLACE_CATEGORIES as [string, ...string[]]),
  useCases: z.string().max(300).optional().default(""),
  shortDescription: z.string().max(280).optional().default(""),
  readme: z.string().max(8000).optional().default(""),
});
const updateIntegrationOverridesSchema = z.object({
  fnId: z.string(),
  aiProvider: z.enum(["", "openai", "claude"]),
  aiModel: z.string().max(120).optional(),
  openaiApiKey: z.string().max(8_192).optional(),
  claudeApiKey: z.string().max(8_192).optional(),
  vectorPrimary: z.enum(["", "external_http", "postgres"]),
  vectorSecondary: z.enum(["", "none", "external_http", "postgres"]),
  vectorServiceUrl: z.string().max(8_192).optional(),
  vectorDatabaseUrl: z.string().max(8_192).optional(),
});
const listGithubBranchesSchema = z.object({
  fnId: z.string(),
  repoId: z.number().int().positive(),
});
const saveGithubBindingSchema = z.object({
  fnId: z.string(),
  repoId: z.number().int().positive(),
  branch: z.string().trim().min(1).max(200),
  pathPrefix: z.string().trim().max(500).optional(),
});

type FunctionSettingsActionState = {
  ok?: boolean;
  message?: string;
  error?: { form?: string[] };
} | null;

const CLAUDE_MODEL_FALLBACKS = [
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
  "claude-3-haiku-20240307",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasImportForPackage(code: string, packageName: string): boolean {
  const escaped = escapeRegExp(packageName);
  const fromRe = new RegExp(String.raw`from\s+["']${escaped}(?:\/[^"']*)?["']`);
  const sideEffectRe = new RegExp(String.raw`import\s+["']${escaped}(?:\/[^"']*)?["']`);
  const requireRe = new RegExp(String.raw`require\(\s*["']${escaped}(?:\/[^"']*)?["']\s*\)`);
  return fromRe.test(code) || sideEffectRe.test(code) || requireRe.test(code);
}

function toImportIdentifier(packageName: string): string {
  const base = packageName.startsWith("@")
    ? (packageName.split("/")[1] ?? "pkg")
    : (packageName.split("/")[0] ?? "pkg");
  const cleaned = base.replace(/[^a-zA-Z0-9]+/g, " ");
  const parts = cleaned.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "pkg";
  const [first = "pkg", ...rest] = parts;
  const camel = `${first.toLowerCase()}${rest
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join("")}`;
  if (/^[0-9]/.test(camel)) return `pkg${camel}`;
  return camel;
}

function buildImportLine(packageName: string): string {
  if (packageName === DEFAULT_FUNCTION_SDK) return `import fn from "${DEFAULT_FUNCTION_SDK}";`;
  return `import * as ${toImportIdentifier(packageName)} from "${packageName}";`;
}

function addImportToCode(code: string, packageName: string): string {
  if (hasImportForPackage(code, packageName)) return code;
  const importLine = buildImportLine(packageName);
  const trimmedStart = code.trimStart();
  if (!trimmedStart) return `${importLine}\n`;
  return `${importLine}\n${code}`;
}

function removeImportFromCode(code: string, packageName: string): string {
  const escaped = escapeRegExp(packageName);
  const patterns = [
    new RegExp(
      String.raw`^\s*import\s+[\s\S]*?\s+from\s+["']${escaped}(?:\/[^"']*)?["'];?\s*$\n?`,
      "gm",
    ),
    new RegExp(String.raw`^\s*import\s+["']${escaped}(?:\/[^"']*)?["'];?\s*$\n?`, "gm"),
    new RegExp(
      String.raw`^\s*(?:const|let|var)\s+[\w$]+\s*=\s*require\(\s*["']${escaped}(?:\/[^"']*)?["']\s*\);?\s*$\n?`,
      "gm",
    ),
  ];
  let next = code;
  for (const pattern of patterns) {
    next = next.replace(pattern, "");
  }
  return next.replace(/\n{3,}/g, "\n\n");
}

function nowIso(): string {
  return new Date().toISOString();
}

function mergePackages(
  existing: FunctionPackageRecord[],
  additions: Array<{
    name: string;
    source: FunctionPackageRecord["source"];
    version: string | null;
  }>,
): FunctionPackageRecord[] {
  const byName = new Map(existing.map((pkg) => [pkg.name, pkg]));
  for (const addition of additions) {
    const current = byName.get(addition.name);
    if (current) {
      byName.set(addition.name, {
        ...current,
        source: current.source === "default" ? "default" : addition.source,
        version: addition.version ?? current.version,
        updatedAt: nowIso(),
      });
      continue;
    }

    byName.set(addition.name, {
      name: addition.name,
      source: addition.source,
      version: addition.version,
      updatedAt: nowIso(),
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function assertOrgOwnsFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      currentVersionId: schema.fn.currentVersionId,
    })
    .from(schema.fn)
    .where(compatWhere(sql`${schema.fn.id} = ${fnId} and ${schema.fn.orgId} = ${orgId}`) as never)
    .limit(1);
  if (rows.length === 0) throw new Error("not found");
  const row = rows[0];
  if (!row) throw new Error("not found");
  return row;
}

export async function saveDraft(input: z.infer<typeof saveDraftSchema>) {
  const { session, orgId } = await requireOrgPermission("edit_draft");
  const parsed = saveDraftSchema.parse(input);
  await ensureWorkspaceSdkApiKey({ orgId, userId: session.user.id });

  await assertOrgOwnsFunction(orgId, parsed.fnId);

  const detected = extractExternalPackageNames(parsed.code);
  if (detected.length > 0) {
    const existing = await getFunctionPackagesForOrg(orgId, parsed.fnId);
    const existingNames = new Set(existing.map((pkg) => pkg.name));
    const missing = detected.filter((pkgName) => !existingNames.has(pkgName));
    if (missing.length > 0) {
      const latestVersions = await Promise.all(
        missing.map((pkgName) => getLatestNpmVersion(pkgName)),
      );
      const additions = missing.map((name, idx) => ({
        name,
        source: "auto" as const,
        version: latestVersions[idx] ?? null,
      }));
      const merged = mergePackages(existing, additions);
      await setFunctionPackagesForOrg(orgId, parsed.fnId, merged);
    }
  }

  await db
    .insert(schema.fnDraft)
    .values({
      fnId: parsed.fnId,
      userId: session.user.id,
      code: parsed.code,
    })
    .onConflictDoUpdate({
      target: [schema.fnDraft.fnId, schema.fnDraft.userId],
      set: { code: parsed.code, updatedAt: new Date() },
    });

  revalidatePath(`/dashboard/${parsed.fnId}`);
  return { ok: true };
}

export async function generateCodeFromPrompt(input: z.infer<typeof generateCodeSchema>) {
  const { orgId, session } = await requireOrgPermission("edit_draft");
  const parsed = generateCodeSchema.parse(input);
  const fnRow = await assertOrgOwnsFunction(orgId, parsed.fnId);
  const draft = await getDraft(parsed.fnId, session.user.id);
  const packages = await getFunctionPackagesForOrg(orgId, parsed.fnId);

  const ai = await resolveAiConfigForGeneration({
    orgId,
    fnId: parsed.fnId,
    provider: parsed.provider as AiProvider,
    model: parsed.model,
  });

  const externalDocsContext = parsed.useLiveLookup
    ? await fetchExternalDocsContext({
        query: parsed.prompt.trim(),
        hints: parsed.lookupHints,
      })
    : "";

  const attachmentRows =
    parsed.contextIds.length > 0
      ? await getEnabledContextsByIds(orgId, parsed.fnId, parsed.contextIds)
      : [];
  const attachments: GeneratorAttachment[] = attachmentRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    content: row.content,
    sourceUri: row.sourceUri,
    bytes: row.bytes,
  }));

  const messages = buildGeneratorMessages({
    userPrompt: parsed.prompt.trim(),
    currentCode: draft?.code ?? "",
    fnSlug: fnRow.slug,
    packages,
    externalDocsContext,
    attachments,
  });

  try {
    let generated = extractTsCode(
      await generateWithProvider(ai.provider, ai.apiKey, ai.model, messages),
    );
    const validation = validateGeneratedCode(generated);
    if (!validation.ok) {
      const repaired = await generateWithProvider(
        ai.provider,
        ai.apiKey,
        ai.model,
        buildRepairMessages({ priorCode: generated, reasons: validation.reasons }),
      );
      generated = extractTsCode(repaired);
    }
    generated = enforceMainAndSdkImport(generated);
    return { code: generated };
  } catch (error) {
    if (error instanceof IntegrationConfigError) throw error;
    const message = error instanceof Error ? error.message : "generation_failed";
    throw new Error(message);
  }
}

async function generateWithProvider(
  provider: AiProvider,
  apiKey: string,
  model: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
): Promise<string> {
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`provider_error:${response.status}:${JSON.stringify(json)}`);
    }
    return json?.choices?.[0]?.message?.content ?? "";
  }

  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .filter(Boolean);
  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: "user" as const, content: m.content }));
  const candidateModels = [model, ...CLAUDE_MODEL_FALLBACKS.filter((m) => m !== model)];
  let lastError = "";
  for (const modelName of candidateModels) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 2400,
        ...(systemParts.length > 0 ? { system: systemParts.join("\n\n") } : {}),
        messages:
          anthropicMessages.length > 0 ? anthropicMessages : [{ role: "user", content: "" }],
      }),
    });
    const json = await response.json().catch(() => null);
    if (response.ok) {
      return json?.content?.[0]?.text ?? "";
    }
    const raw = JSON.stringify(json);
    lastError = `provider_error:${response.status}:${raw}`;
    const modelNotFound =
      response.status === 404 || raw.includes("not_found_error") || raw.includes('"model:');
    if (!modelNotFound) break;
  }
  throw new Error(lastError || "provider_error:anthropic_generation_failed");
}

export interface DeployResultUi {
  ok: boolean;
  versionId: string;
  runUrl: string;
}

export async function getFunctionRunUrl(fnId: string): Promise<string> {
  const { orgId } = await requireOrgPermission("view_workspace");
  const fnRow = await assertOrgOwnsFunction(orgId, fnId);
  const orgRows = await db
    .select({ slug: schema.organization.slug })
    .from(schema.organization)
    .where(compatWhere(sql`${schema.organization.id} = ${orgId}`) as never)
    .limit(1);
  const orgSlug = orgRows[0]?.slug;
  if (!orgSlug) throw new Error("org_not_found");
  return `${env.HOSTFUNC_RUNTIME_URL}/run/${orgSlug}/${fnRow.slug}`;
}

export async function runFunctionNow(input: z.infer<typeof runFunctionSchema>) {
  const parsed = runFunctionSchema.parse(input);
  const runUrl = await getFunctionRunUrl(parsed.fnId);
  const raw = (parsed.payloadJson ?? "").trim();
  let payload: unknown = {};
  if (raw.length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("invalid_json_payload");
    }
  }

  const response = await fetch(runUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const bodyText = await response.text().catch(() => "");
  let bodyJson: unknown = null;
  if (bodyText) {
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      bodyJson = null;
    }
  }

  return {
    runUrl,
    ok: response.ok,
    status: response.status,
    executionId: response.headers.get("x-hostfunc-exec-id"),
    wallMs: response.headers.get("x-hostfunc-wall-ms"),
    bodyText,
    bodyJson,
  };
}

export async function inferRunPayload(input: z.infer<typeof inferRunPayloadSchema>): Promise<{
  payloadJson: string;
  source: "static" | "ai_fallback" | "default";
  reason?: string;
}> {
  const { orgId } = await requireOrgPermission("view_workspace");
  const parsed = inferRunPayloadSchema.parse(input);
  const fnRow = await assertOrgOwnsFunction(orgId, parsed.fnId);

  const staticResult = inferPayloadStatic(parsed.code);
  if (staticResult.ok) {
    return {
      payloadJson: JSON.stringify(staticResult.payload, null, 2),
      source: "static",
    };
  }

  try {
    const ai =
      (await tryResolveAiForPayload(orgId, parsed.fnId, "openai", "gpt-4o-mini")) ??
      (await tryResolveAiForPayload(orgId, parsed.fnId, "claude", "claude-3-5-sonnet-latest"));
    if (!ai) {
      return {
        payloadJson: "{}",
        source: "default",
        reason: "ai_not_configured_for_payload_inference",
      };
    }
    const content = await generateWithProvider(
      ai.provider,
      ai.apiKey,
      ai.model,
      buildPayloadInferenceMessages({
        fnSlug: fnRow.slug,
        currentCode: parsed.code,
      }),
    );
    const candidate = extractJsonObject(content);
    const parsedPayload = parsePayloadCandidate(candidate);
    if (!parsedPayload.ok) {
      return {
        payloadJson: "{}",
        source: "default",
        reason: parsedPayload.reason ?? "ai_output_invalid",
      };
    }
    return {
      payloadJson: JSON.stringify(parsedPayload.payload, null, 2),
      source: "ai_fallback",
      ...(staticResult.reason ? { reason: staticResult.reason } : {}),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "payload_inference_failed";
    return {
      payloadJson: "{}",
      source: "default",
      reason,
    };
  }
}

async function tryResolveAiForPayload(
  orgId: string,
  fnId: string,
  provider: AiProvider,
  model: string,
) {
  try {
    return await resolveAiConfigForGeneration({ orgId, fnId, provider, model });
  } catch {
    return null;
  }
}

export async function deployFunction(fnId: string): Promise<DeployResultUi> {
  const { session, orgId } = await requireOrgPermission("deploy_function");
  const workspaceSdkApiKey = await ensureWorkspaceSdkApiKey({ orgId, userId: session.user.id });
  const fnRow = await assertOrgOwnsFunction(orgId, fnId);
  const orgRows = await db
    .select({ slug: schema.organization.slug })
    .from(schema.organization)
    .where(compatWhere(sql`${schema.organization.id} = ${orgId}`) as never)
    .limit(1);
  const orgSlug = orgRows[0]?.slug;
  if (!orgSlug) throw new Error("org_not_found");
  await getFunctionPackagesForOrg(orgId, fnId);
  const orgPlan = await getOrgPlan(orgId);
  const maxActiveFunctions = orgPlan?.limits.maxFunctions ?? 3;

  const drafts = await db
    .select()
    .from(schema.fnDraft)
    .where(
      compatWhere(
        sql`${schema.fnDraft.fnId} = ${fnId} and ${schema.fnDraft.userId} = ${session.user.id}`,
      ) as never,
    )
    .limit(1);

  const code = drafts[0]?.code;
  if (!code) throw new Error("nothing to deploy");

  if (!fnRow.currentVersionId) {
    const activeCountRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.fn)
      .where(
        compatWhere(
          sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.currentVersionId} is not null`,
        ) as never,
      )
      .limit(1);
    const activeCount = activeCountRows[0]?.count ?? 0;
    if (activeCount >= maxActiveFunctions) {
      throw new Error(`plan_limit_exceeded:max_active_functions:${maxActiveFunctions}`);
    }
  }

  const versionId = genId("ver");
  const sizeBytes = Buffer.byteLength(code, "utf8");
  const sha256 = createHash("sha256").update(code).digest("hex");

  await db.insert(schema.fnVersion).values({
    id: versionId,
    fnId,
    orgId,
    code,
    sizeBytes,
    sha256,
    status: "deploying",
    createdById: session.user.id,
  });

  try {
    const draftAssetSummaries = await listFunctionAssets(fnId);
    const draftAssets = await Promise.all(
      draftAssetSummaries.map(async (summary) => {
        const blob = await getFunctionAssetBlob({ fnId, path: summary.path });
        if (!blob) return null;
        return {
          path: blob.path,
          mime: blob.mime,
          content: blob.content,
        };
      }),
    );
    const cleanAssets = draftAssets.filter(
      (a): a is { path: string; mime: string; content: Buffer } => a !== null,
    );

    if (cleanAssets.length > 0) {
      await snapshotAssetsToVersion({ fnId, versionId, orgId });
    }

    const result = await executor.deploy({
      functionId: fnId,
      versionId,
      orgId,
      runtimeApiKey: workspaceSdkApiKey,
      bundle: { code, sizeBytes, sha256 },
      limits: {
        wallMs: orgPlan?.limits.maxWallMs ?? 10_000,
        cpuMs: orgPlan?.limits.maxCpuMs ?? 1_000,
        memoryMb: orgPlan?.limits.maxMemoryMb ?? 128,
        egressKb: orgPlan?.limits.maxEgressKbPerExecution ?? 1024,
        subrequests: orgPlan?.limits.maxSubrequestsPerExecution ?? 20,
        maxCallDepth: orgPlan?.limits.maxCallDepth ?? 3,
      },
      secretRefs: [],
      assets: cleanAssets,
    });
    const enriched = result as typeof result & {
      sourceMap?: string;
      sourceMapSha256?: string;
    };

    await db
      .update(schema.fnVersion)
      .set({
        status: "deployed",
        backendHandle: result.handle,
        warnings: result.warnings ?? [],
        sourceMap: enriched.sourceMap ?? null,
        sourceMapSha256: enriched.sourceMapSha256 ?? null,
      })
      .where(compatWhere(sql`${schema.fnVersion.id} = ${versionId}`) as never);

    await db
      .update(schema.fn)
      .set({ currentVersionId: versionId, updatedAt: new Date() })
      .where(compatWhere(sql`${schema.fn.id} = ${fnId}`) as never);

    await purgeLookupCache(orgSlug, fnRow.slug).catch(() => {
      // Cache is best-effort; deploy success should not hinge on purge availability.
    });

    revalidatePath(`/dashboard/${fnId}`);

    const runUrl = `${env.HOSTFUNC_RUNTIME_URL}/run/${orgSlug}/${fnRow.slug}`;
    return { ok: true, versionId, runUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    await db
      .update(schema.fnVersion)
      .set({ status: "failed" })
      .where(compatWhere(sql`${schema.fnVersion.id} = ${versionId}`) as never);
    throw new Error(message);
  }
}

export async function listSecrets(fnId: string) {
  const { orgId } = await requireOrgPermission("view_workspace");
  await assertOrgOwnsFunction(orgId, fnId);
  return listSecretsForFunction(orgId, fnId);
}

export async function listFunctionPackages(fnId: string) {
  const { orgId } = await requireOrgPermission("view_workspace");
  await assertOrgOwnsFunction(orgId, fnId);
  return getFunctionPackagesForOrg(orgId, fnId);
}

export async function addFunctionPackage(input: z.infer<typeof addPackageSchema>) {
  const { orgId, session } = await requireOrgPermission("manage_packages");
  const parsed = addPackageSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);

  const name = parsed.name.trim();
  const existing = await getFunctionPackagesForOrg(orgId, parsed.fnId);
  if (existing.some((pkg) => pkg.name === name)) return { ok: true };

  const latest = await getLatestNpmVersion(name);
  const merged = mergePackages(existing, [{ name, source: "manual", version: latest }]);
  await setFunctionPackagesForOrg(orgId, parsed.fnId, merged);

  const draftRows = await db
    .select({ code: schema.fnDraft.code })
    .from(schema.fnDraft)
    .where(
      compatWhere(
        sql`${schema.fnDraft.fnId} = ${parsed.fnId} and ${schema.fnDraft.userId} = ${session.user.id}`,
      ) as never,
    )
    .limit(1);
  const currentCode = draftRows[0]?.code ?? "";
  const nextCode = addImportToCode(currentCode, name);
  if (nextCode !== currentCode) {
    await db
      .insert(schema.fnDraft)
      .values({
        fnId: parsed.fnId,
        userId: session.user.id,
        code: nextCode,
      })
      .onConflictDoUpdate({
        target: [schema.fnDraft.fnId, schema.fnDraft.userId],
        set: { code: nextCode, updatedAt: new Date() },
      });
  }

  revalidatePath(`/dashboard/${parsed.fnId}`);
  revalidatePath(`/dashboard/${parsed.fnId}/settings/packages`);
  return { ok: true, codeUpdated: nextCode !== currentCode };
}

export async function removeFunctionPackage(input: z.infer<typeof removePackageSchema>) {
  const { orgId, session } = await requireOrgPermission("manage_packages");
  const parsed = removePackageSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);

  if (parsed.name === DEFAULT_FUNCTION_SDK) {
    throw new Error("default_package_protected");
  }

  const existing = await getFunctionPackagesForOrg(orgId, parsed.fnId);
  const next = existing.filter((pkg) => pkg.name !== parsed.name);
  await setFunctionPackagesForOrg(orgId, parsed.fnId, next);

  const draftRows = await db
    .select({ code: schema.fnDraft.code })
    .from(schema.fnDraft)
    .where(
      compatWhere(
        sql`${schema.fnDraft.fnId} = ${parsed.fnId} and ${schema.fnDraft.userId} = ${session.user.id}`,
      ) as never,
    )
    .limit(1);
  const currentCode = draftRows[0]?.code ?? "";
  const updatedCode = removeImportFromCode(currentCode, parsed.name);
  if (updatedCode !== currentCode) {
    await db
      .insert(schema.fnDraft)
      .values({
        fnId: parsed.fnId,
        userId: session.user.id,
        code: updatedCode,
      })
      .onConflictDoUpdate({
        target: [schema.fnDraft.fnId, schema.fnDraft.userId],
        set: { code: updatedCode, updatedAt: new Date() },
      });
  }

  revalidatePath(`/dashboard/${parsed.fnId}`);
  revalidatePath(`/dashboard/${parsed.fnId}/settings/packages`);
  return { ok: true };
}

export async function refreshFunctionPackageVersion(input: z.infer<typeof refreshPackageSchema>) {
  const { orgId } = await requireOrgPermission("manage_packages");
  const parsed = refreshPackageSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);

  const existing = await getFunctionPackagesForOrg(orgId, parsed.fnId);
  const target = existing.find((pkg) => pkg.name === parsed.name);
  if (!target) throw new Error("package_not_found");

  const latest = await getLatestNpmVersion(parsed.name);
  const next = existing.map((pkg) =>
    pkg.name === parsed.name ? { ...pkg, version: latest, updatedAt: nowIso() } : pkg,
  );
  await setFunctionPackagesForOrg(orgId, parsed.fnId, next);
  revalidatePath(`/dashboard/${parsed.fnId}/settings/packages`);
  return { ok: true };
}

export async function setSecret(input: z.infer<typeof setSecretSchema>) {
  const { orgId, session } = await requireOrgPermission("manage_secrets");
  const parsed = setSecretSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  await setSecretForFunction({
    orgId,
    fnId: parsed.fnId,
    key: parsed.key,
    value: parsed.value,
    userId: session.user.id,
  });
  revalidatePath(`/dashboard/${parsed.fnId}/settings`);
  return { ok: true };
}

export async function deleteSecret(input: z.infer<typeof deleteSecretSchema>) {
  const { orgId } = await requireOrgPermission("manage_secrets");
  const parsed = deleteSecretSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  await deleteSecretForFunction(orgId, parsed.fnId, parsed.key);
  revalidatePath(`/dashboard/${parsed.fnId}/settings`);
  return { ok: true };
}

export async function updateFunctionDescriptionAction(formData: FormData) {
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = updateDescriptionSchema.parse({
    fnId: formData.get("fnId"),
    description: formData.get("description") ?? "",
  });
  await assertOrgOwnsFunction(orgId, parsed.fnId);

  await db
    .update(schema.fn)
    .set({ description: parsed.description.trim(), updatedAt: new Date() })
    .where(
      compatWhere(sql`${schema.fn.id} = ${parsed.fnId} and ${schema.fn.orgId} = ${orgId}`) as never,
    );

  revalidatePath(`/dashboard/${parsed.fnId}`);
  revalidatePath(`/dashboard/${parsed.fnId}/settings`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/functions");
}

export async function updateFunctionVisibilityAction(formData: FormData) {
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = updateVisibilitySchema.parse({
    fnId: formData.get("fnId"),
    visibility: formData.get("visibility"),
  });
  await updateFunctionVisibility({
    orgId,
    fnId: parsed.fnId,
    visibility: parsed.visibility,
  });

  revalidatePath(`/dashboard/${parsed.fnId}`);
  revalidatePath(`/dashboard/${parsed.fnId}/settings`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/functions");
  revalidatePath("/marketplace");
}

export async function updateFunctionMarketplaceProfileAction(formData: FormData) {
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = updateMarketplaceProfileSchema.parse({
    fnId: formData.get("fnId"),
    category: formData.get("category"),
    useCases: formData.get("useCases") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    readme: formData.get("readme") ?? "",
  });
  await upsertFunctionMarketplaceProfile({
    orgId,
    fnId: parsed.fnId,
    category: parsed.category as (typeof MARKETPLACE_CATEGORIES)[number],
    useCases: parsed.useCases
      .split(",")
      .map((useCase) => useCase.trim())
      .filter(Boolean),
    shortDescription: parsed.shortDescription,
    readme: parsed.readme,
  });

  revalidatePath(`/dashboard/${parsed.fnId}/settings`);
  revalidatePath("/marketplace");
}

export async function updateFunctionIntegrationOverridesAction(formData: FormData) {
  const { orgId, session } = await requireOrgPermission("manage_secrets");
  const parsed = updateIntegrationOverridesSchema.parse({
    fnId: formData.get("fnId"),
    aiProvider: formData.get("aiProvider"),
    aiModel: (formData.get("aiModel") ?? "").toString().trim() || undefined,
    openaiApiKey: (formData.get("openaiApiKey") ?? "").toString().trim() || undefined,
    claudeApiKey: (formData.get("claudeApiKey") ?? "").toString().trim() || undefined,
    vectorPrimary: formData.get("vectorPrimary"),
    vectorSecondary: formData.get("vectorSecondary"),
    vectorServiceUrl: (formData.get("vectorServiceUrl") ?? "").toString().trim() || undefined,
    vectorDatabaseUrl: (formData.get("vectorDatabaseUrl") ?? "").toString().trim() || undefined,
  });
  await assertOrgOwnsFunction(orgId, parsed.fnId);

  const upsert = async (key: string, value?: string | null) => {
    if (!value || value === "none") {
      await deleteSecretForFunction(orgId, parsed.fnId, key);
      return;
    }
    await setSecretForFunction({
      orgId,
      fnId: parsed.fnId,
      key,
      value,
      userId: session.user.id,
    });
  };

  await upsert("HF_FN_AI_PROVIDER", parsed.aiProvider || null);
  await upsert("HF_FN_AI_MODEL", parsed.aiModel);
  await upsert("HF_FN_OPENAI_API_KEY", parsed.openaiApiKey);
  await upsert("HF_FN_CLAUDE_API_KEY", parsed.claudeApiKey);
  await upsert("HF_FN_VECTOR_BACKEND_PRIMARY", parsed.vectorPrimary || null);
  await upsert("HF_FN_VECTOR_BACKEND_SECONDARY", parsed.vectorSecondary || null);
  await upsert("HF_FN_VECTOR_SERVICE_URL", parsed.vectorServiceUrl);
  await upsert("HF_FN_VECTOR_DATABASE_URL", parsed.vectorDatabaseUrl);

  revalidatePath(`/dashboard/${parsed.fnId}/settings`);
}

export async function updateFunctionIntegrationOverridesStateAction(
  _prevState: FunctionSettingsActionState,
  formData: FormData,
): Promise<FunctionSettingsActionState> {
  try {
    await updateFunctionIntegrationOverridesAction(formData);
    return { ok: true, message: "Function integration overrides updated." };
  } catch (error) {
    return {
      error: {
        form: [error instanceof Error ? error.message : "Failed to update function integrations."],
      },
    };
  }
}

export async function listFunctionGithubRepos(fnId: string) {
  const { orgId } = await requireOrgPermission("view_workspace");
  await assertOrgOwnsFunction(orgId, fnId);
  const repos = await listSelectedGithubReposForOrg(orgId);
  return repos.map((repo) => ({
    repoId: repo.repoId,
    fullName: repo.fullName,
    defaultBranch: repo.defaultBranch,
    private: repo.isPrivate,
  }));
}

export async function listFunctionGithubBranches(input: z.infer<typeof listGithubBranchesSchema>) {
  const { orgId } = await requireOrgPermission("view_workspace");
  const parsed = listGithubBranchesSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  return listGithubBranchesForRepo({ orgId, repoId: parsed.repoId });
}

export async function getFunctionGithubBindingAction(fnId: string) {
  const { orgId } = await requireOrgPermission("view_workspace");
  await assertOrgOwnsFunction(orgId, fnId);
  return getFunctionGithubBinding({ orgId, fnId });
}

export async function saveFunctionGithubBindingAction(
  input: z.infer<typeof saveGithubBindingSchema>,
) {
  const { orgId, session } = await requireOrgPermission("edit_draft");
  const parsed = saveGithubBindingSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  await saveFunctionGithubBinding({
    orgId,
    fnId: parsed.fnId,
    userId: session.user.id,
    repoId: parsed.repoId,
    branch: parsed.branch,
    pathPrefix: parsed.pathPrefix || null,
  });
  revalidatePath(`/dashboard/${parsed.fnId}/settings/integrations`);
  revalidatePath(`/dashboard/${parsed.fnId}`);
  return { ok: true };
}

export async function removeFunctionGithubBindingAction(fnId: string) {
  const { orgId } = await requireOrgPermission("edit_draft");
  await assertOrgOwnsFunction(orgId, fnId);
  await removeFunctionGithubBinding({ orgId, fnId });
  revalidatePath(`/dashboard/${fnId}/settings/integrations`);
  revalidatePath(`/dashboard/${fnId}`);
  return { ok: true };
}

async function purgeLookupCache(orgSlug: string, slug: string) {
  if (!env.CF_FN_INDEX_KV_ID) return;
  const maybeExecutor = executor as typeof executor & {
    purgeLookupCache?: (key: string) => Promise<void>;
  };
  await maybeExecutor.purgeLookupCache?.(`${orgSlug}:${slug}`);
}

const createFnAiContextSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("note"),
    fnId: z.string(),
    name: z.string().trim().min(1).max(200),
    content: z.string().min(1).max(200_000),
  }),
  z.object({
    kind: z.literal("url"),
    fnId: z.string(),
    name: z.string().trim().min(1).max(200),
    url: z.string().trim().url(),
  }),
]);

const updateFnAiContextSchema = z.object({
  fnId: z.string(),
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(200).optional(),
  content: z.string().min(1).max(200_000).optional(),
  enabled: z.boolean().optional(),
});

const idAndFnSchema = z.object({
  fnId: z.string(),
  id: z.string().min(1).max(80),
});

function mapFnAiContextError(error: unknown): Error {
  if (error instanceof FnAiContextError) {
    return new Error(error.code);
  }
  if (error instanceof Error) return error;
  return new Error("fn_ai_context_failed");
}

function toClientContextRecord(record: FnAiContextRecord) {
  return {
    id: record.id,
    kind: record.kind,
    name: record.name,
    sourceUri: record.sourceUri,
    mime: record.mime,
    bytes: record.bytes,
    enabled: record.enabled,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export type FnAiContextClient = ReturnType<typeof toClientContextRecord>;

export async function createFnAiContextAction(input: z.infer<typeof createFnAiContextSchema>) {
  const { orgId, session } = await requireOrgPermission("edit_draft");
  const parsed = createFnAiContextSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  try {
    if (parsed.kind === "note") {
      const created = await createFnAiContextRecord({
        orgId,
        fnId: parsed.fnId,
        userId: session.user.id,
        kind: "note",
        name: parsed.name,
        content: parsed.content,
      });
      revalidatePath(`/dashboard/${parsed.fnId}/settings/context`);
      revalidatePath(`/dashboard/${parsed.fnId}`);
      return { ok: true as const, item: toClientContextRecord(created) };
    }
    const fetched = await fetchUrlAsContext(parsed.url);
    const created = await createFnAiContextRecord({
      orgId,
      fnId: parsed.fnId,
      userId: session.user.id,
      kind: "url",
      name: parsed.name,
      content: fetched.content,
      sourceUri: fetched.sourceUri,
      mime: fetched.mime,
    });
    revalidatePath(`/dashboard/${parsed.fnId}/settings/context`);
    revalidatePath(`/dashboard/${parsed.fnId}`);
    return { ok: true as const, item: toClientContextRecord(created) };
  } catch (error) {
    throw mapFnAiContextError(error);
  }
}

export async function updateFnAiContextAction(input: z.infer<typeof updateFnAiContextSchema>) {
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = updateFnAiContextSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  try {
    const updated = await updateFnAiContextRecord({
      orgId,
      fnId: parsed.fnId,
      id: parsed.id,
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.content !== undefined ? { content: parsed.content } : {}),
      ...(parsed.enabled !== undefined ? { enabled: parsed.enabled } : {}),
    });
    revalidatePath(`/dashboard/${parsed.fnId}/settings/context`);
    revalidatePath(`/dashboard/${parsed.fnId}`);
    return { ok: true as const, item: toClientContextRecord(updated) };
  } catch (error) {
    throw mapFnAiContextError(error);
  }
}

export async function toggleFnAiContextAction(
  input: z.infer<typeof idAndFnSchema> & { enabled: boolean },
) {
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = idAndFnSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  try {
    const updated = await toggleFnAiContextEnabled(
      orgId,
      parsed.fnId,
      parsed.id,
      Boolean(input.enabled),
    );
    revalidatePath(`/dashboard/${parsed.fnId}/settings/context`);
    revalidatePath(`/dashboard/${parsed.fnId}`);
    return { ok: true as const, item: toClientContextRecord(updated) };
  } catch (error) {
    throw mapFnAiContextError(error);
  }
}

export async function deleteFnAiContextAction(input: z.infer<typeof idAndFnSchema>) {
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = idAndFnSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  try {
    await deleteFnAiContextRecord(orgId, parsed.fnId, parsed.id);
    revalidatePath(`/dashboard/${parsed.fnId}/settings/context`);
    revalidatePath(`/dashboard/${parsed.fnId}`);
    return { ok: true as const };
  } catch (error) {
    throw mapFnAiContextError(error);
  }
}

export async function refreshFnAiContextUrlAction(input: z.infer<typeof idAndFnSchema>) {
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = idAndFnSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  try {
    const updated = await refreshFnAiContextUrl(orgId, parsed.fnId, parsed.id);
    revalidatePath(`/dashboard/${parsed.fnId}/settings/context`);
    revalidatePath(`/dashboard/${parsed.fnId}`);
    return { ok: true as const, item: toClientContextRecord(updated) };
  } catch (error) {
    throw mapFnAiContextError(error);
  }
}
