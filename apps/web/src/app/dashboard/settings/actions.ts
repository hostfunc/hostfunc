"use server";

import { requireOrgPermission } from "@/lib/session";
import {
  type AiProvider,
  type VectorBackend,
  updateWorkspaceIntegrations,
} from "@/server/integrations";
import { db, schema } from "@hostfunc/db";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type SettingsActionState = {
  ok?: boolean;
  message?: string;
  error?: {
    form?: string[];
    name?: string[];
    slug?: string[];
  };
} | null;

const nameSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
});

const slugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug must be at least 3 characters")
    .max(64, "Slug must be 64 characters or fewer")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
});

const integrationsSchema = z.object({
  aiProvider: z.enum(["openai", "claude"]),
  aiModel: z.string().trim().min(1).max(120),
  vectorPrimary: z.enum(["external_http", "postgres"]),
  vectorSecondary: z.enum(["external_http", "postgres", "none"]),
  openaiApiKey: z.string().trim().max(8_192).optional(),
  claudeApiKey: z.string().trim().max(8_192).optional(),
  vectorServiceUrl: z.string().trim().max(8_192).optional(),
  vectorDatabaseUrl: z.string().trim().max(8_192).optional(),
});

function asErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  ) {
    return "That slug is already taken.";
  }
  if (error instanceof Error && error.message === "forbidden") {
    return "You do not have permission to change workspace settings.";
  }
  return "Failed to update workspace settings. Please try again.";
}

export async function updateWorkspaceNameAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = nameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");
    await db
      .update(schema.organization)
      .set({ name: parsed.data.name })
      .where(eq(schema.organization.id, orgId));
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { ok: true, message: "Workspace name updated." };
  } catch (error) {
    return { error: { form: [asErrorMessage(error)] } };
  }
}

export async function updateWorkspaceSlugAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = slugSchema.safeParse({
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");
    const existing = await db.query.organization.findFirst({
      where: and(
        eq(schema.organization.slug, parsed.data.slug),
        ne(schema.organization.id, orgId),
      ),
      columns: { id: true },
    });
    if (existing) {
      return { error: { slug: ["That slug is already taken."] } };
    }

    await db
      .update(schema.organization)
      .set({ slug: parsed.data.slug })
      .where(eq(schema.organization.id, orgId));
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { ok: true, message: "Workspace slug updated." };
  } catch (error) {
    return { error: { form: [asErrorMessage(error)] } };
  }
}

export async function updateWorkspaceIntegrationsAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = integrationsSchema.safeParse({
    aiProvider: formData.get("aiProvider"),
    aiModel: formData.get("aiModel"),
    vectorPrimary: formData.get("vectorPrimary"),
    vectorSecondary: formData.get("vectorSecondary"),
    openaiApiKey: formData.get("openaiApiKey") || undefined,
    claudeApiKey: formData.get("claudeApiKey") || undefined,
    vectorServiceUrl: formData.get("vectorServiceUrl") || undefined,
    vectorDatabaseUrl: formData.get("vectorDatabaseUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: { form: ["Invalid integration settings form input."] } };
  }

  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");
    await updateWorkspaceIntegrations({
      orgId,
      config: {
        ai: {
          provider: parsed.data.aiProvider as AiProvider,
          model: parsed.data.aiModel,
        },
        vector: {
          primary: parsed.data.vectorPrimary as VectorBackend,
          secondary:
            parsed.data.vectorSecondary === "none"
              ? null
              : (parsed.data.vectorSecondary as VectorBackend),
        },
      },
      plaintextSecrets: {
        ...(parsed.data.openaiApiKey ? { openaiApiKey: parsed.data.openaiApiKey } : {}),
        ...(parsed.data.claudeApiKey ? { claudeApiKey: parsed.data.claudeApiKey } : {}),
        ...(parsed.data.vectorServiceUrl ? { vectorServiceUrl: parsed.data.vectorServiceUrl } : {}),
        ...(parsed.data.vectorDatabaseUrl
          ? { vectorDatabaseUrl: parsed.data.vectorDatabaseUrl }
          : {}),
      },
    });
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/integrations");
    return { ok: true, message: "Integration defaults updated." };
  } catch (error) {
    return { error: { form: [asErrorMessage(error)] } };
  }
}

export async function updateWorkspaceIntegrationsFormAction(formData: FormData): Promise<void> {
  await updateWorkspaceIntegrationsAction(null, formData);
}
