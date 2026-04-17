"use server";

import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { DEFAULT_FUNCTION_SDK, type FunctionPackageRecord } from "@/lib/function-packages";
import { getLatestNpmVersion } from "@/lib/npm-registry";
import { extractExternalPackageNames } from "@/lib/package-imports";
import { requireOrgPermission } from "@/lib/session";
import { executor } from "@/server/executor";
import {
  deleteSecretForFunction,
  getFunctionPackagesForOrg,
  listSecretsForFunction,
  setFunctionPackagesForOrg,
  setSecretForFunction,
} from "@/server/functions";
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
  const { orgId } = await requireOrgPermission("edit_draft");
  const parsed = generateCodeSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);

  const prompt = parsed.prompt.trim();
  const escapedPrompt = JSON.stringify(prompt);
  const generated = `import fn from "@hostfunc/fn";

/**
 * AI generated scaffold (stub provider).
 * Prompt: ${escapedPrompt}
 */
export default async function main(input: unknown) {
  fn.log("info", "Function invoked", { hasInput: Boolean(input) });

  // TODO: Replace this scaffold with your implementation.
  return {
    ok: true,
    summary: "Generated from prompt",
    prompt: ${escapedPrompt},
    input,
  };
}
`;
  return { code: generated };
}

export interface DeployResultUi {
  ok: boolean;
  versionId: string;
  runUrl: string;
}

export async function deployFunction(fnId: string): Promise<DeployResultUi> {
  const { session, orgId } = await requireOrgPermission("deploy_function");
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
    const result = await executor.deploy({
      functionId: fnId,
      versionId,
      orgId,
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

async function purgeLookupCache(orgSlug: string, slug: string) {
  if (!env.CF_FN_INDEX_KV_ID) return;
  const maybeExecutor = executor as typeof executor & {
    purgeLookupCache?: (key: string) => Promise<void>;
  };
  await maybeExecutor.purgeLookupCache?.(`${orgSlug}:${slug}`);
}
